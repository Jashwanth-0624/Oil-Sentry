from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OperationalAlertBase(BaseModel):
    well_id: str
    depth: float | None = None
    event_type: str
    severity: str
    probability: float
    risk_class_id: int
    status: str = "ACTIVE"
    source: str = "SIMULATION"
    scenario: str | None = None
    description: str | None = None
    telemetry_snapshot: dict[str, Any] | None = None
    recovery_time: datetime | None = None
    acknowledged_at: datetime | None = None


class OperationalAlertCreate(OperationalAlertBase):
    pass


class OperationalAlertResponse(OperationalAlertBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



class OperationalAlertListResponse(BaseModel):
    alerts: list[OperationalAlertResponse]
    total: int


class AlertAcknowledgeResponse(BaseModel):
    id: int
    status: str
    acknowledged_at: datetime
    message: str


class OperationalAlertWebSocketMessage(BaseModel):
    type: str = Field(..., description="Message type: 'alert' or 'alert_recovery'")
    alert_id: int
    well_id: str
    event_type: str
    severity: str
    probability: float
    depth: float | None = None
    timestamp: str
    status: str
    source: str = "SIMULATION"
    message: str
