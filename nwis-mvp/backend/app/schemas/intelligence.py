"""Request and response contracts for grounded intelligence generation."""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field

class IntelligenceQueryRequest(BaseModel):
    well_id: str = Field(min_length=1, max_length=32)
    question: str = Field(min_length=1, max_length=2000)

class IntelligenceLlmStatus(BaseModel):
    provider: str | None = None
    model: str | None = None
    grounded: bool = True
    status: str

class IntelligenceQueryResponse(BaseModel):
    well_id: str
    question: str
    answer: str | None = None
    key_findings: list[str] = Field(default_factory=list)
    risk_context: dict[str, Any] = Field(default_factory=dict)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    generation_status: str
    llm: IntelligenceLlmStatus
