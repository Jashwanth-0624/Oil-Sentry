from typing import Any

from pydantic import BaseModel, Field


class RagQueryRequest(BaseModel):
	question: str = Field(min_length=3)
	top_k: int | None = Field(default=None, ge=1, le=20)
	well_id: str | None = None
	field: str | None = None
	formation: str | None = None


class RagSource(BaseModel):
	well_id: str | None = None
	document: str
	page: int | None = None
	chunk_index: int | None = None


class RagRetrievedChunk(BaseModel):
	well_id: str | None = None
	document_name: str
	field: str | None = None
	page_number: int | None = None
	chunk_index: int
	similarity: float
	distance: float
	content: str


class RagEvidenceItem(BaseModel):
	well_id: str | None = None
	source: str
	relevance: float | None = None


class RagLlmStatus(BaseModel):
	configured: bool = False
	provider: str | None = None
	model: str | None = None
	status: str = "not_configured"


class RagQueryResponse(BaseModel):
	question: str
	answer: str
	sources: list[RagSource]
	retrieved: list[RagRetrievedChunk]
	generation_status: str
	retrieval_backend: str
	pgvector_enabled: bool
	min_similarity: float
	top_k: int
	embedding_model: str
	embedding_dimension: int
	metadata: dict[str, Any] | None = None
	llm: RagLlmStatus | None = None
	evidence: list[RagEvidenceItem] = Field(default_factory=list)
	confidence: str | None = None
	limitations: list[str] = Field(default_factory=list)
	grounded: bool = True

