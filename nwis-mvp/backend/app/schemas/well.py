from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.rag import (
	RagEvidenceItem,
	RagLlmStatus,
	RagRetrievedChunk,
	RagSource,
)
from app.schemas.risk import RiskPredictResponse
from app.schemas.similarity import SimilarityResult


class WellListItem(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	well_id: str
	field: str | None = None
	latitude: float | None = None
	longitude: float | None = None
	total_depth: float | None = None
	well_type: str | None = None
	status: str | None = None


class FormationItem(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	formation_name: str
	top_depth: float | None = None
	bottom_depth: float | None = None
	lithology: str | None = None
	pressure: float | None = None
	temperature: float | None = None


class DrillingLogItem(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	timestamp: datetime
	depth: float | None = None
	rop: float | None = None
	wob: float | None = None
	rpm: float | None = None
	torque: float | None = None
	standpipe_pressure: float | None = None
	mud_density: float | None = None
	event_label: int


class EventItem(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	depth: float | None = None
	formation: str | None = None
	event_type: str
	severity: str
	description: str | None = None
	cause: str | None = None
	mitigation: str | None = None
	outcome: str | None = None


class WellDetailResponse(BaseModel):
	well: WellListItem
	formations: list[FormationItem]
	recent_drilling: list[DrillingLogItem]
	events: list[EventItem]


class RagHistoricalContext(BaseModel):
	question: str
	answer: str
	generation_status: str
	retrieval_backend: str
	pgvector_enabled: bool
	sources: list[RagSource]
	retrieved: list[RagRetrievedChunk]
	llm: RagLlmStatus | None = None
	evidence: list[RagEvidenceItem] = Field(default_factory=list)
	confidence: str | None = None
	limitations: list[str] = Field(default_factory=list)
	grounded: bool = True


class WellIntelligenceResponse(BaseModel):
	well: WellListItem
	formations: list[FormationItem]
	recent_drilling: list[DrillingLogItem]
	events: list[EventItem]
	similar_wells: list[SimilarityResult]
	risk: RiskPredictResponse | None = None
	historical_context: RagHistoricalContext | None = None
