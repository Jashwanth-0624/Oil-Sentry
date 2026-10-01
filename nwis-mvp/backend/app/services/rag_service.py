"""Orchestrate retrieval and grounded generation for RAG queries."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
	sys.path.insert(0, str(PROJECT_ROOT))

from rag.generation.generator import generate_answer  # noqa: E402
from rag.retrieval.retriever import (  # noqa: E402
	DEFAULT_MIN_SIMILARITY,
	DEFAULT_TOP_K,
	retrieve,
)


def _env_float(name: str, default: float) -> float:
	raw = os.getenv(name)
	if raw is None or raw.strip() == "":
		return default
	return float(raw)


def _env_int(name: str, default: int) -> int:
	raw = os.getenv(name)
	if raw is None or raw.strip() == "":
		return default
	return int(raw)


def sources_from_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
	seen: set[tuple] = set()
	sources: list[dict[str, Any]] = []
	for chunk in chunks:
		key = (
			chunk.get("well_id"),
			chunk.get("document_name"),
			chunk.get("page_number"),
			chunk.get("chunk_index"),
		)
		if key in seen:
			continue
		seen.add(key)
		sources.append(
			{
				"well_id": chunk.get("well_id"),
				"document": chunk.get("document_name"),
				"page": chunk.get("page_number"),
				"chunk_index": chunk.get("chunk_index"),
			}
		)
	return sources


def query_historical_knowledge(
	db: Session,
	question: str,
	top_k: int | None = None,
	well_id: str | None = None,
	field: str | None = None,
	formation: str | None = None,
	well_context: dict[str, Any] | None = None,
	include_generation: bool = True,
) -> dict[str, Any]:
	"""Retrieve historical evidence and, when requested, synthesize an answer.

	Internal callers that will perform their own grounded synthesis should set
	``include_generation`` to ``False``. This preserves retrieved evidence while
	preventing a second, redundant LLM request.
	"""
	resolved_top_k = top_k if top_k is not None else _env_int("RAG_TOP_K", DEFAULT_TOP_K)
	min_similarity = _env_float("RAG_MIN_SIMILARITY", DEFAULT_MIN_SIMILARITY)
	# A named well in the natural-language question is an unambiguous structured
	# constraint. Applying it avoids unrelated but similarly worded well reports
	# being cited for a well-specific question.
	question_well = re.search(r"\b(W\d{3})\b", question.upper())
	resolved_well_id = well_id or (question_well.group(1) if question_well else None)
	filters = {
		key: value
		for key, value in {
			"well_id": resolved_well_id,
			"field": field,
			"formation": formation,
		}.items()
		if value
	}
	retrieval = retrieve(
		db,
		question,
		top_k=resolved_top_k,
		min_similarity=min_similarity,
		filters=filters or None,
	)
	chunks = retrieval["results"]

	# Build contextual well information if not passed explicitly
	resolved_well_context = well_context
	if resolved_well_context is None and resolved_well_id:
		try:
			from app.models import Well
			well_obj = db.query(Well).filter(Well.well_id == resolved_well_id).first()
			if well_obj:
				resolved_well_context = {
					"well_id": well_obj.well_id,
					"field": well_obj.field,
					"well_type": well_obj.well_type,
					"total_depth": well_obj.total_depth,
					"status": well_obj.status,
				}
		except Exception:
			resolved_well_context = None

	if include_generation:
		generated = generate_answer(question, chunks, well_context=resolved_well_context)
	else:
		generated = {
			"answer": None,
			"generation_status": "not_requested",
			"evidence": [],
			"confidence": None,
			"limitations": [],
			"grounded": True,
			"called_llm": False,
			"llm": None,
		}
	return {
		"question": question,
		"answer": generated["answer"],
		"sources": sources_from_chunks(chunks),
		"retrieved": [
			{
				"well_id": item.get("well_id"),
				"document_name": item.get("document_name"),
				"field": item.get("field"),
				"page_number": item.get("page_number"),
				"chunk_index": item.get("chunk_index"),
				"similarity": item.get("similarity"),
				"distance": item.get("distance"),
				"content": item.get("content"),
			}
			for item in chunks
		],
		"generation_status": generated["generation_status"],
		"retrieval_backend": retrieval["retrieval_backend"],
		"pgvector_enabled": retrieval["pgvector_enabled"],
		"min_similarity": min_similarity,
		"top_k": resolved_top_k,
		"embedding_model": retrieval["embedding_model"],
		"embedding_dimension": retrieval["embedding_dimension"],
		"llm": generated.get("llm"),
		"evidence": generated.get("evidence", []),
		"confidence": generated.get("confidence"),
		"limitations": generated.get("limitations", []),
		"grounded": generated.get("grounded", True),
		"metadata": {
			"pgvector_error": retrieval.get("pgvector_error"),
			"called_llm": generated.get("called_llm"),
			"llm_provider": generated.get("llm", {}).get("provider") if generated.get("llm") else None,
		},
	}

