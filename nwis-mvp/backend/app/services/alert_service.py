from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.operational_alert import OperationalAlert

logger = logging.getLogger(__name__)


def map_alert_severity(probability: float, threshold: float | None = None) -> str:
    """Map XGBoost predicted hazard probability to standardized severity."""
    t = threshold if threshold is not None else settings.alert_probability_threshold
    if probability < t:
        return "NORMAL"
    if probability < 0.85:
        return "WARNING"
    if probability < 0.95:
        return "HIGH"
    return "CRITICAL"


class AlertEngine:
    """Stateful alert engine processing live telemetry frames for a drilling connection.
    
    Prevents single-frame jitter false positives by requiring sustained risk frames
    before persisting and broadcasting an alert. Debounces recovery over consecutive
    normal frames.
    """

    def __init__(
        self,
        probability_threshold: float | None = None,
        sustained_frames: int | None = None,
        recovery_frames: int | None = None,
    ) -> None:
        self.probability_threshold = (
            probability_threshold
            if probability_threshold is not None
            else settings.alert_probability_threshold
        )
        self.sustained_frames = (
            sustained_frames
            if sustained_frames is not None
            else settings.alert_sustained_frames
        )
        self.recovery_frames = (
            recovery_frames
            if recovery_frames is not None
            else settings.alert_recovery_frames
        )

        self.consecutive_high_frames: int = 0
        self.consecutive_low_frames: int = 0
        self.active_alert_id: int | None = None
        self.active_event_type: str | None = None
        self.active_severity: str | None = None

    def reset_state(self) -> None:
        """Reset internal frame counters and active tracking."""
        self.consecutive_high_frames = 0
        self.consecutive_low_frames = 0
        self.active_alert_id = None
        self.active_event_type = None
        self.active_severity = None

    def process_telemetry_frame(
        self,
        frame: dict[str, Any],
        scenario: str | None = None,
        db: Session | None = None,
    ) -> dict[str, Any] | None:
        """Evaluate a telemetry frame and trigger alert creation or recovery.
        
        Returns:
            A dict with type 'alert' or 'alert_recovery' if an alert transition occurred,
            or None if no change in alert state.
        """
        risk_info = frame.get("risk") or {}
        risk_label = str(risk_info.get("label", "NORMAL")).upper()
        probability = float(risk_info.get("probability", 0.0))
        risk_class_id = int(risk_info.get("class_id", 0))
        well_id = str(frame.get("well_id", "W001"))
        depth = frame.get("depth")
        timestamp = frame.get("timestamp") or datetime.now(timezone.utc).isoformat()

        is_elevated_risk = (
            risk_label != "NORMAL" and probability >= self.probability_threshold
        )

        if is_elevated_risk:
            self.consecutive_high_frames += 1
            self.consecutive_low_frames = 0

            # Trigger condition: sustained frames reached and no active alert
            if (
                self.consecutive_high_frames >= self.sustained_frames
                and self.active_alert_id is None
            ):
                severity = map_alert_severity(probability, self.probability_threshold)
                depth_str = f" at depth {depth:.1f}m" if depth is not None else ""
                description = (
                    f"Model-generated simulated {risk_label} risk condition detected with "
                    f"{probability * 100:.1f}% confidence{depth_str}."
                )


                created_alert = self._persist_new_alert(
                    well_id=well_id,
                    depth=depth,
                    event_type=risk_label,
                    severity=severity,
                    probability=probability,
                    risk_class_id=risk_class_id,
                    scenario=scenario,
                    description=description,
                    telemetry_snapshot=frame,
                    db=db,
                )

                if created_alert:
                    self.active_alert_id = created_alert.id
                    self.active_event_type = risk_label
                    self.active_severity = severity

                    logger.info(
                        "Created operational alert %d for well %s: %s (%s, %.1f%%)",
                        created_alert.id,
                        well_id,
                        risk_label,
                        severity,
                        probability * 100,
                    )

                    return {
                        "type": "alert",
                        "alert_id": created_alert.id,
                        "well_id": well_id,
                        "event_type": risk_label,
                        "severity": severity,
                        "probability": probability,
                        "depth": depth,
                        "timestamp": timestamp,
                        "status": "ACTIVE",
                        "source": "SIMULATION",
                        "message": description,
                    }

            # Sustained condition remains active -> duplicate prevention
            return None

        else:
            # Condition is normal or sub-threshold
            self.consecutive_high_frames = 0

            if self.active_alert_id is not None:
                self.consecutive_low_frames += 1

                # Recovery condition: sustained low frames reached
                if self.consecutive_low_frames >= self.recovery_frames:
                    recovered_id = self.active_alert_id
                    recovered_event = self.active_event_type or "EVENT"
                    recovered_severity = self.active_severity or "WARNING"

                    self._persist_alert_recovery(alert_id=recovered_id, db=db)

                    logger.info(
                        "Recovered operational alert %d for well %s (%s)",
                        recovered_id,
                        well_id,
                        recovered_event,
                    )

                    # Reset active alert state
                    self.active_alert_id = None
                    self.active_event_type = None
                    self.active_severity = None
                    self.consecutive_low_frames = 0

                    return {
                        "type": "alert_recovery",
                        "alert_id": recovered_id,
                        "well_id": well_id,
                        "event_type": recovered_event,
                        "severity": recovered_severity,
                        "probability": probability,
                        "depth": depth,
                        "timestamp": timestamp,
                        "status": "RECOVERED",
                        "source": "SIMULATION",
                        "message": f"Simulated {recovered_event} risk condition recovered.",
                    }

            return None

    def _persist_new_alert(
        self,
        well_id: str,
        depth: float | None,
        event_type: str,
        severity: str,
        probability: float,
        risk_class_id: int,
        scenario: str | None,
        description: str,
        telemetry_snapshot: dict[str, Any],
        db: Session | None = None,
    ) -> OperationalAlert | None:
        """Persist newly triggered operational alert in PostgreSQL."""
        own_session = False
        session = db
        if session is None:
            session = SessionLocal()
            own_session = True

        try:
            alert = OperationalAlert(
                well_id=well_id,
                depth=depth,
                event_type=event_type,
                severity=severity,
                probability=probability,
                risk_class_id=risk_class_id,
                status="ACTIVE",
                source="SIMULATION",
                scenario=scenario,
                description=description,
                telemetry_snapshot=telemetry_snapshot,
            )
            session.add(alert)
            session.commit()
            session.refresh(alert)
            return alert
        except Exception as exc:
            session.rollback()
            logger.error("Failed to persist operational alert: %s", exc)
            return None
        finally:
            if own_session:
                session.close()

    def _persist_alert_recovery(
        self,
        alert_id: int,
        db: Session | None = None,
    ) -> bool:
        """Mark existing operational alert as recovered."""
        own_session = False
        session = db
        if session is None:
            session = SessionLocal()
            own_session = True

        try:
            alert = session.query(OperationalAlert).filter(OperationalAlert.id == alert_id).first()
            if alert:
                alert.status = "RECOVERED"
                alert.recovery_time = datetime.now(timezone.utc)
                session.commit()
                return True
            return False
        except Exception as exc:
            session.rollback()
            logger.error("Failed to mark alert %d as recovered: %s", alert_id, exc)
            return False
        finally:
            if own_session:
                session.close()


def get_alerts(
    db: Session,
    well_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    event_type: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[OperationalAlert], int]:
    """Query operational alerts with optional multi-attribute filters."""
    query = db.query(OperationalAlert)

    if well_id:
        query = query.filter(OperationalAlert.well_id == well_id)
    if severity:
        query = query.filter(OperationalAlert.severity == severity.upper())
    if status:
        query = query.filter(OperationalAlert.status == status.upper())
    if event_type:
        query = query.filter(OperationalAlert.event_type == event_type.upper())
    if source:
        query = query.filter(OperationalAlert.source == source.upper())

    total = query.count()
    alerts = (
        query.order_by(desc(OperationalAlert.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return alerts, total


def get_alert_by_id(db: Session, alert_id: int) -> OperationalAlert | None:
    """Fetch single operational alert by primary key."""
    return db.query(OperationalAlert).filter(OperationalAlert.id == alert_id).first()


def acknowledge_alert(db: Session, alert_id: int) -> OperationalAlert | None:
    """Acknowledge an operational alert, updating status without deletion."""
    alert = db.query(OperationalAlert).filter(OperationalAlert.id == alert_id).first()
    if not alert:
        return None

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert
