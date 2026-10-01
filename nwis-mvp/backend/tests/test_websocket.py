"""Integration tests for FastAPI WebSocket live drilling telemetry stream."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.telemetry_simulator import TelemetrySimulator

client = TestClient(app)


def test_telemetry_simulator_physics_and_features() -> None:
    sim = TelemetrySimulator(well_id="W001", initial_depth=3500.0, scenario="normal")
    frame = sim.next_frame()

    assert frame["type"] == "telemetry"
    assert frame["well_id"] == "W001"
    assert frame["depth"] >= 3500.0

    # Verify all seven required drilling features are present
    assert isinstance(frame["depth"], float)
    assert isinstance(frame["rop"], float)
    assert isinstance(frame["wob"], float)
    assert isinstance(frame["rpm"], float)
    assert isinstance(frame["torque"], float)
    assert isinstance(frame["standpipe_pressure"], float)
    assert isinstance(frame["mud_density"], float)

    # Verify real XGBoost risk inference
    assert frame["risk"] is not None
    assert "label" in frame["risk"]
    assert "class_id" in frame["risk"]
    assert "probability" in frame["risk"]
    assert "probabilities" in frame["risk"]
    assert len(frame["risk"]["probabilities"]) == 4


def test_telemetry_simulator_handles_model_failure_gracefully(monkeypatch: pytest.MonkeyPatch) -> None:
    def failing_predict(features: dict[str, float]) -> dict:
        raise RuntimeError("Simulated XGBoost inference failure")

    monkeypatch.setattr("app.services.telemetry_simulator.predict_drilling_risk", failing_predict)

    sim = TelemetrySimulator(well_id="W001", initial_depth=3500.0)
    frame = sim.next_frame()

    # Telemetry should still produce physics frame, with risk set to None
    assert frame["type"] == "telemetry"
    assert frame["depth"] >= 3500.0
    assert frame["risk"] is None


def test_websocket_connection_and_handshake() -> None:
    with client.websocket_connect("/ws/live") as ws:
        greeting = ws.receive_json()
        assert greeting["type"] == "connected"
        assert greeting["well_id"] == "W001"
        assert greeting["frequency_hz"] == 1.0


def test_websocket_telemetry_stream_and_schema() -> None:
    with client.websocket_connect("/ws/live") as ws:
        # Handshake
        greeting = ws.receive_json()
        assert greeting["type"] == "connected"

        # Receive at least one telemetry frame
        frame = ws.receive_json()
        assert frame["type"] == "telemetry"
        assert frame["well_id"] == "W001"

        # Check all 7 features
        for key in ["depth", "rop", "wob", "rpm", "torque", "standpipe_pressure", "mud_density"]:
            assert key in frame
            assert isinstance(frame[key], (int, float))

        # Check risk prediction block
        assert "risk" in frame
        if frame["risk"] is not None:
            assert "label" in frame["risk"]
            assert "class_id" in frame["risk"]
            assert "probability" in frame["risk"]
            assert "probabilities" in frame["risk"]


def test_websocket_start_and_pause_controls() -> None:
    with client.websocket_connect("/ws/live") as ws:
        ws.receive_json()  # Greeting

        # Send pause command
        ws.send_json({"type": "stop"})
        status_msg = ws.receive_json()
        # Find status or skip any in-flight frame
        while status_msg.get("type") == "telemetry":
            status_msg = ws.receive_json()

        assert status_msg["type"] == "status"
        assert status_msg["status"] == "paused"

        # Send start command
        ws.send_json({"type": "start", "well_id": "W002", "scenario": "high_torque"})
        start_ack = ws.receive_json()
        while start_ack.get("type") == "telemetry":
            start_ack = ws.receive_json()

        assert start_ack["type"] == "status"
        assert start_ack["status"] == "streaming"
        assert start_ack["well_id"] == "W002"


def test_websocket_invalid_well_handling() -> None:
    with client.websocket_connect("/ws/live") as ws:
        ws.receive_json()  # Greeting

        # Send start command with non-existent well
        ws.send_json({"type": "start", "well_id": "W999"})
        err_msg = ws.receive_json()
        while err_msg.get("type") == "telemetry":
            err_msg = ws.receive_json()

        assert err_msg["type"] == "error"
        assert err_msg["code"] == "INVALID_WELL"
        assert "W999" in err_msg["message"]


def test_websocket_scenario_change_and_ping() -> None:
    with client.websocket_connect("/ws/live") as ws:
        ws.receive_json()  # Greeting

        # Send scenario update
        ws.send_json({"type": "set_scenario", "scenario": "mud_loss"})
        ack = ws.receive_json()
        while ack.get("type") == "telemetry":
            ack = ws.receive_json()

        assert ack["type"] == "status"
        assert ack["status"] == "scenario_updated"
        assert ack["scenario"] == "mud_loss"

        # Send ping
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        while pong.get("type") == "telemetry":
            pong = ws.receive_json()

        assert pong["type"] == "pong"


def test_websocket_multiple_simultaneous_connections() -> None:
    """Verify multiple concurrent WebSocket connections maintain isolated simulation states."""
    with client.websocket_connect("/ws/live") as ws1:
        with client.websocket_connect("/ws/live") as ws2:
            g1 = ws1.receive_json()
            g2 = ws2.receive_json()
            assert g1["type"] == "connected"
            assert g2["type"] == "connected"

            # Set ws1 to W001 and ws2 to W002
            ws1.send_json({"type": "start", "well_id": "W001", "scenario": "normal"})
            ws2.send_json({"type": "start", "well_id": "W002", "scenario": "high_torque"})

            # Drain status messages
            s1 = ws1.receive_json()
            while s1.get("type") == "telemetry":
                s1 = ws1.receive_json()
            assert s1["well_id"] == "W001"

            s2 = ws2.receive_json()
            while s2.get("type") == "telemetry":
                s2 = ws2.receive_json()
            assert s2["well_id"] == "W002"

