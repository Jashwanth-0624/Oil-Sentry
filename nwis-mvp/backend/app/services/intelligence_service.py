"""Intelligence orchestration service combining wells, similarity, risk, and RAG."""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import DrillingLog, Event, Formation, Well
from app.services.rag_service import query_historical_knowledge
from app.services.risk_service import predict_drilling_risk
from app.services.similarity_engine import get_similar_wells
from app.services.alert_service import get_alerts
from rag.generation.context_builder import build_grounded_context
from rag.generation.generator import generate_grounded_response

logger = logging.getLogger(__name__)


def get_well_or_404(db: Session, well_id: str) -> Well:
	"""Fetch a well by well_id or raise HTTP 404."""
	well = db.query(Well).filter(Well.well_id == well_id).first()
	if well is None:
		raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")
	return well


def list_all_wells(db: Session) -> list[Well]:
	"""Return all available wells ordered by well_id."""
	return db.query(Well).order_by(Well.well_id.asc()).all()


def get_well_details(db: Session, well_id: str) -> dict[str, Any]:
	"""Fetch complete detail for a well including formations, recent drilling, and events."""
	well = get_well_or_404(db, well_id)

	formations = (
		db.query(Formation)
		.filter(Formation.well_id == well.id)
		.order_by(Formation.top_depth.asc().nulls_last())
		.all()
	)

	recent_drilling = (
		db.query(DrillingLog)
		.filter(DrillingLog.well_id == well.id)
		.order_by(DrillingLog.timestamp.desc())
		.limit(20)
		.all()
	)

	events = (
		db.query(Event)
		.filter(Event.well_id == well.id)
		.order_by(Event.depth.asc().nulls_last())
		.all()
	)

	return {
		"well": well,
		"formations": formations,
		"recent_drilling": recent_drilling,
		"events": events,
	}


def get_well_similar_orchestration(
	db: Session,
	well_id: str,
	radius_km: float = 10.0,
	limit: int = 5,
) -> dict[str, Any]:
	"""Delegate similarity search to the similarity engine for a given well."""
	current_well, results = get_similar_wells(db, well_id, radius_km=radius_km, limit=limit)
	if current_well is None:
		raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

	valid_results: list[dict[str, Any]] = []
	for item in results:
		valid_results.append(
			{
				"well_id": item["well_id"],
				"field": item["field"],
				"distance_km": float(item["distance_km"]),
				"similarity_score": round(float(item["similarity_score"]), 1),
				"distance_similarity": float(item["distance_similarity"]),
				"formation_similarity": float(item["formation_similarity"]),
				"depth_similarity": float(item["depth_similarity"]),
				"geological_similarity": float(item["geological_similarity"]),
				"common_formations": list(item["common_formations"]),
				"total_depth": item["total_depth"],
				"well_type": item["well_type"],
				"status": item["status"],
			}
		)

	return {
		"current_well": {
			"well_id": current_well.well_id,
			"field": current_well.field,
			"latitude": current_well.latitude,
			"longitude": current_well.longitude,
			"total_depth": current_well.total_depth,
		},
		"search_radius_km": radius_km,
		"results": valid_results,
	}


def predict_well_risk_orchestration(
	db: Session,
	well_id: str,
	drilling_params: dict[str, float],
) -> dict[str, Any]:
	"""Validate well existence and run drilling risk prediction."""
	get_well_or_404(db, well_id)
	return predict_drilling_risk(drilling_params)


def get_well_intelligence(
	db: Session,
	well_id: str,
	radius_km: float = 10.0,
	similar_limit: int = 5,
) -> dict[str, Any]:
	"""Unified orchestration combining well data, similarity, risk, and RAG."""
	details = get_well_details(db, well_id)
	well = details["well"]
	formations = details["formations"]
	recent_drilling = details["recent_drilling"]
	events = details["events"]

	# 1. Similarity Engine
	_, similarity_results = get_similar_wells(db, well_id, radius_km=radius_km, limit=similar_limit)
	similar_wells: list[dict[str, Any]] = []
	for item in similarity_results:
		similar_wells.append(
			{
				"well_id": item["well_id"],
				"field": item["field"],
				"distance_km": float(item["distance_km"]),
				"similarity_score": round(float(item["similarity_score"]), 1),
				"distance_similarity": float(item["distance_similarity"]),
				"formation_similarity": float(item["formation_similarity"]),
				"depth_similarity": float(item["depth_similarity"]),
				"geological_similarity": float(item["geological_similarity"]),
				"common_formations": list(item["common_formations"]),
				"total_depth": item["total_depth"],
				"well_type": item["well_type"],
				"status": item["status"],
			}
		)

	# 2. Risk Prediction (using latest recent drilling log if sufficient features exist)
	risk_prediction: dict[str, Any] | None = None
	if recent_drilling:
		latest_log = recent_drilling[0]
		candidate_features = {
			"depth": latest_log.depth,
			"rop": latest_log.rop,
			"wob": latest_log.wob,
			"rpm": latest_log.rpm,
			"torque": latest_log.torque,
			"standpipe_pressure": latest_log.standpipe_pressure,
			"mud_density": latest_log.mud_density,
		}
		if all(
			val is not None and isinstance(val, (int, float)) and val > 0
			for val in candidate_features.values()
		):
			try:
				risk_prediction = predict_drilling_risk(
					{k: float(v) for k, v in candidate_features.items()}
				)
			except Exception as exc:
				logger.warning("Risk prediction omitted for %s: %s", well_id, exc)
				risk_prediction = None

	# 3. RAG Retrieval (deterministic well query)
	rag_question = f"What historical drilling problems and mitigation occurred in or around well {well_id}?"
	target_well_context = {
		"well_id": well.well_id,
		"field": well.field,
		"well_type": well.well_type,
		"total_depth": well.total_depth,
		"status": well.status,
		"similar_wells": [w["well_id"] for w in similar_wells[:3]],
	}
	rag_result = query_historical_knowledge(
		db,
		question=rag_question,
		top_k=5,
		well_id=well_id,
		well_context=target_well_context,
		include_generation=False,
	)
	historical_context = {
		"question": rag_result["question"],
		"answer": rag_result["answer"],
		"generation_status": rag_result["generation_status"],
		"retrieval_backend": rag_result["retrieval_backend"],
		"pgvector_enabled": rag_result["pgvector_enabled"],
		"sources": rag_result["sources"],
		"retrieved": rag_result["retrieved"],
		"llm": rag_result.get("llm"),
		"evidence": rag_result.get("evidence", []),
		"confidence": rag_result.get("confidence"),
		"limitations": rag_result.get("limitations", []),
		"grounded": rag_result.get("grounded", True),
	}

	return {
		"well": well,
		"formations": formations,
		"recent_drilling": recent_drilling,
		"events": events,
		"similar_wells": similar_wells,
		"risk": risk_prediction,
		"historical_context": historical_context,
	}


def generate_intelligence_response(db: Session, well_id: str, question: str) -> dict[str, Any]:
	"""Compose verified project context then delegate only generation to the LLM layer."""
	intelligence = get_well_intelligence(db, well_id)
	alerts, _ = get_alerts(db, well_id=well_id, status="ACTIVE", limit=20)
	generated = generate_grounded_response(question, build_grounded_context(intelligence, alerts=alerts))
	llm_info = generated.get("llm") or {}
	is_gemini = os.getenv("LLM_PROVIDER", "").lower() == "gemini"
	return {
		"well_id": well_id, "question": question, "answer": generated.get("answer"),
		"key_findings": generated.get("key_findings", []), "risk_context": generated.get("risk_context", {}),
		"evidence": generated.get("evidence", []), "limitations": generated.get("limitations", []),
		"generation_status": generated["generation_status"],
		"llm": {"provider": llm_info.get("provider", "gemini" if is_gemini else None),
			"model": llm_info.get("model", os.getenv("GEMINI_MODEL") if is_gemini else None),
			"grounded": True, "status": llm_info.get("status", generated["generation_status"])},
	}
