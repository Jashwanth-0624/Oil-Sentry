"""Pydantic schemas for simulated drilling telemetry and WebSocket messages."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class TelemetryRiskSummary(BaseModel):
    """Real-time XGBoost risk prediction attached to each telemetry frame."""
    label: str
    class_id: int
    probability: float
    probabilities: dict[str, float] = Field(default_factory=dict)


class TelemetryFrame(BaseModel):
    """1 Hz simulated drilling dynamics telemetry frame."""
    type: str = "telemetry"
    timestamp: str
    well_id: str
    depth: float
    rop: float
    wob: float
    rpm: float
    torque: float
    standpipe_pressure: float
    mud_density: float
    scenario: str | None = None
    risk: TelemetryRiskSummary | None = None


class TelemetryError(BaseModel):
    """Structured error message emitted over WebSocket."""
    type: str = "error"
    code: str
    message: str
    details: dict[str, Any] | None = None


class TelemetryConnectionAck(BaseModel):
    """Initial handshake confirmation message."""
    type: str = "connected"
    message: str = "Drilling telemetry WebSocket stream connected"
    well_id: str | None = None
    status: str = "ready"
