from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.alert import (
    AlertAcknowledgeResponse,
    OperationalAlertListResponse,
    OperationalAlertResponse,
)
from app.services.alert_service import (
    acknowledge_alert,
    get_alert_by_id,
    get_alerts,
)

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=OperationalAlertListResponse)
def list_alerts(
    well_id: str | None = Query(None, description="Filter by well identifier (e.g. W001)"),
    severity: str | None = Query(None, description="Filter by severity (WARNING, HIGH, CRITICAL)"),
    status: str | None = Query(None, description="Filter by status (ACTIVE, RECOVERED, ACKNOWLEDGED)"),
    event_type: str | None = Query(None, description="Filter by event hazard type (HIGH_TORQUE, MUD_LOSS, STUCK_PIPE)"),
    source: str | None = Query(None, description="Filter by source (SIMULATION)"),
    limit: int = Query(50, ge=1, le=200, description="Max alerts to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve operational alerts filtered by well, severity, hazard status, or source."""
    alerts, total = get_alerts(
        db=db,
        well_id=well_id,
        severity=severity,
        status=status,
        event_type=event_type,
        source=source,
        limit=limit,
        offset=offset,
    )
    return {"alerts": alerts, "total": total}


@router.get("/alerts/{alert_id}", response_model=OperationalAlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
) -> OperationalAlertResponse:
    """Retrieve a single operational alert by primary key ID."""
    alert = get_alert_by_id(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Operational alert {alert_id} not found.")
    return alert


@router.get("/wells/{well_id}/alerts", response_model=OperationalAlertListResponse)
def get_well_alerts(
    well_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve all operational alerts specifically for the specified well."""
    alerts, total = get_alerts(
        db=db,
        well_id=well_id,
        limit=limit,
        offset=offset,
    )
    return {"alerts": alerts, "total": total}


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertAcknowledgeResponse)
def acknowledge_operational_alert(
    alert_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Acknowledge an operational alert without deleting it from historical records."""
    alert = acknowledge_alert(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Operational alert {alert_id} not found.")
    return {
        "id": alert.id,
        "status": alert.status,
        "acknowledged_at": alert.acknowledged_at,
        "message": f"Operational alert {alert_id} successfully acknowledged.",
    }
