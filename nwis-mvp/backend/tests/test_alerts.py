from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.main import app
from app.models.operational_alert import OperationalAlert
from app.services.alert_service import AlertEngine, map_alert_severity

client = TestClient(app)


def test_map_alert_severity() -> None:
    """Verify deterministic mapping of probability to alert severity."""
    assert map_alert_severity(0.50, threshold=0.75) == "NORMAL"
    assert map_alert_severity(0.74, threshold=0.75) == "NORMAL"
    assert map_alert_severity(0.75, threshold=0.75) == "WARNING"
    assert map_alert_severity(0.84, threshold=0.75) == "WARNING"
    assert map_alert_severity(0.85, threshold=0.75) == "HIGH"
    assert map_alert_severity(0.94, threshold=0.75) == "HIGH"
    assert map_alert_severity(0.95, threshold=0.75) == "CRITICAL"
    assert map_alert_severity(0.99, threshold=0.75) == "CRITICAL"


def test_alert_engine_sustained_threshold_and_duplicate_prevention() -> None:
    """Verify alert triggers only after sustained consecutive frames and prevents duplicates."""
    engine = AlertEngine(probability_threshold=0.75, sustained_frames=3, recovery_frames=3)

    frame_norm = {
        "well_id": "W001",
        "depth": 3500.0,
        "timestamp": "2026-09-30T00:00:00",
        "risk": {"label": "NORMAL", "probability": 0.95, "class_id": 0},
    }
    frame_high = {
        "well_id": "W001",
        "depth": 3501.0,
        "timestamp": "2026-09-30T00:00:01",
        "risk": {"label": "HIGH_TORQUE", "probability": 0.88, "class_id": 3},
    }

    # Frame 1: High risk -> no alert yet
    res1 = engine.process_telemetry_frame(frame_high)
    assert res1 is None
    assert engine.consecutive_high_frames == 1
    assert engine.active_alert_id is None

    # Frame 2: High risk -> no alert yet
    res2 = engine.process_telemetry_frame(frame_high)
    assert res2 is None
    assert engine.consecutive_high_frames == 2
    assert engine.active_alert_id is None

    # Frame 3: Sustained threshold reached -> alert created!
    res3 = engine.process_telemetry_frame(frame_high)
    assert res3 is not None
    assert res3["type"] == "alert"
    assert res3["well_id"] == "W001"
    assert res3["event_type"] == "HIGH_TORQUE"
    assert res3["severity"] == "HIGH"
    assert res3["status"] == "ACTIVE"
    assert res3["source"] == "SIMULATION"
    alert_id = res3["alert_id"]
    assert alert_id is not None
    assert engine.active_alert_id == alert_id

    # Frame 4 & 5: Sustained condition continues -> duplicate prevention!
    res4 = engine.process_telemetry_frame(frame_high)
    assert res4 is None
    res5 = engine.process_telemetry_frame(frame_high)
    assert res5 is None

    # Recovery: 1 normal frame -> no recovery yet
    rec1 = engine.process_telemetry_frame(frame_norm)
    assert rec1 is None
    assert engine.active_alert_id == alert_id

    # 2 normal frames -> no recovery yet
    rec2 = engine.process_telemetry_frame(frame_norm)
    assert rec2 is None
    assert engine.active_alert_id == alert_id

    # 3 normal frames -> recovery triggered!
    rec3 = engine.process_telemetry_frame(frame_norm)
    assert rec3 is not None
    assert rec3["type"] == "alert_recovery"
    assert rec3["alert_id"] == alert_id
    assert rec3["status"] == "RECOVERED"
    assert engine.active_alert_id is None


def test_alert_engine_debounce_interruption() -> None:
    """Verify recovery debounce resets if elevated risk returns before recovery frames complete."""
    engine = AlertEngine(probability_threshold=0.75, sustained_frames=2, recovery_frames=3)

    frame_risk = {
        "well_id": "W002",
        "depth": 3600.0,
        "timestamp": "2026-09-30T00:00:00",
        "risk": {"label": "MUD_LOSS", "probability": 0.82, "class_id": 2},
    }
    frame_norm = {
        "well_id": "W002",
        "depth": 3600.5,
        "timestamp": "2026-09-30T00:00:01",
        "risk": {"label": "NORMAL", "probability": 0.95, "class_id": 0},
    }

    # Trigger alert with 2 frames
    engine.process_telemetry_frame(frame_risk)
    triggered = engine.process_telemetry_frame(frame_risk)
    assert triggered is not None
    alert_id = triggered["alert_id"]

    # 2 normal frames (needs 3 for recovery)
    engine.process_telemetry_frame(frame_norm)
    engine.process_telemetry_frame(frame_norm)
    assert engine.consecutive_low_frames == 2
    assert engine.active_alert_id == alert_id

    # Another high risk frame arrives -> resets recovery counter!
    interrupted = engine.process_telemetry_frame(frame_risk)
    assert interrupted is None
    assert engine.consecutive_low_frames == 0
    assert engine.active_alert_id == alert_id


def test_list_alerts_api() -> None:
    """Test GET /api/alerts with filtering parameters."""
    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total" in data
    assert isinstance(data["alerts"], list)

    # Filter by source
    resp_filtered = client.get("/api/alerts?source=SIMULATION&limit=10")
    assert resp_filtered.status_code == 200
    d_filtered = resp_filtered.json()
    for a in d_filtered["alerts"]:
        assert a["source"] == "SIMULATION"


def test_get_alert_by_id_and_not_found() -> None:
    """Test GET /api/alerts/{id} returns alert or 404."""
    # List to find an existing alert
    list_res = client.get("/api/alerts?limit=1")
    alerts = list_res.json()["alerts"]
    if alerts:
        aid = alerts[0]["id"]
        res = client.get(f"/api/alerts/{aid}")
        assert res.status_code == 200
        assert res.json()["id"] == aid

    # 404 test
    not_found = client.get("/api/alerts/999999")
    assert not_found.status_code == 404


def test_well_alerts_endpoint() -> None:
    """Test GET /api/wells/{well_id}/alerts."""
    res = client.get("/api/wells/W001/alerts")
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert "total" in data


def test_acknowledge_alert_api() -> None:
    """Test POST /api/alerts/{id}/acknowledge."""
    # Create an alert to acknowledge
    db: Session = SessionLocal()
    try:
        test_alert = OperationalAlert(
            well_id="W001",
            depth=3200.0,
            event_type="HIGH_TORQUE",
            severity="HIGH",
            probability=0.88,
            risk_class_id=3,
            status="ACTIVE",
            source="SIMULATION",
        )
        db.add(test_alert)
        db.commit()
        db.refresh(test_alert)
        aid = test_alert.id
    finally:
        db.close()

    res = client.post(f"/api/alerts/{aid}/acknowledge")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == aid
    assert data["status"] == "ACKNOWLEDGED"
    assert data["acknowledged_at"] is not None

    # Unknown alert 404
    not_found = client.post("/api/alerts/999999/acknowledge")
    assert not_found.status_code == 404


def test_alert_engine_probability_boundary_conditions() -> None:
    """Verify exact threshold boundary: 0.75 triggers after sustained frames, 0.749 does not."""
    engine_exact = AlertEngine(probability_threshold=0.75, sustained_frames=2, recovery_frames=2)

    frame_below = {
        "well_id": "W001",
        "depth": 3000.0,
        "risk": {"label": "HIGH_TORQUE", "probability": 0.749, "class_id": 3},
    }
    # 2 frames below threshold should NEVER trigger alert
    assert engine_exact.process_telemetry_frame(frame_below) is None
    assert engine_exact.process_telemetry_frame(frame_below) is None
    assert engine_exact.active_alert_id is None

    # Exactly at threshold (0.75)
    frame_exact = {
        "well_id": "W001",
        "depth": 3000.5,
        "risk": {"label": "HIGH_TORQUE", "probability": 0.75, "class_id": 3},
    }
    assert engine_exact.process_telemetry_frame(frame_exact) is None
    res = engine_exact.process_telemetry_frame(frame_exact)
    assert res is not None
    assert res["type"] == "alert"
    assert res["severity"] == "WARNING"


def test_alert_engine_handles_missing_telemetry_fields() -> None:
    """Verify AlertEngine gracefully handles frames with missing or null fields."""
    engine = AlertEngine(probability_threshold=0.75, sustained_frames=1, recovery_frames=1)

    # Frame with missing depth, timestamp, scenario
    minimal_frame = {
        "well_id": "W003",
        "risk": {"label": "STUCK_PIPE", "probability": 0.96, "class_id": 1},
    }
    res = engine.process_telemetry_frame(minimal_frame)
    assert res is not None
    assert res["type"] == "alert"
    assert res["well_id"] == "W003"
    assert res["severity"] == "CRITICAL"
    assert res["depth"] is None

    # Empty frame (no risk block)
    empty_frame = {}
    res_rec = engine.process_telemetry_frame(empty_frame)
    assert res_rec is not None
    assert res_rec["type"] == "alert_recovery"


def test_alert_engine_database_failure_resilience(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify AlertEngine does not crash if database session fails during persistence."""
    engine = AlertEngine(probability_threshold=0.75, sustained_frames=1, recovery_frames=1)

    def failing_persist(*args, **kwargs):
        return None

    monkeypatch.setattr(engine, "_persist_new_alert", failing_persist)

    frame = {
        "well_id": "W001",
        "depth": 3000.0,
        "risk": {"label": "MUD_LOSS", "probability": 0.88, "class_id": 2},
    }
    # Should not raise exception, returns None
    result = engine.process_telemetry_frame(frame)
    assert result is None
    assert engine.active_alert_id is None

