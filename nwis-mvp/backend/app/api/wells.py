"""API routes for well catalog, well details, similarity, risk, and intelligence orchestration."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.risk import RiskPredictRequest, RiskPredictResponse
from app.schemas.similarity import SimilarityResponse
from app.schemas.well import (
	WellDetailResponse,
	WellIntelligenceResponse,
	WellListItem,
)
from app.services.intelligence_service import (
	get_well_details,
	get_well_intelligence,
	get_well_similar_orchestration,
	list_all_wells,
	predict_well_risk_orchestration,
)

router = APIRouter(prefix="/wells", tags=["wells"])


@router.get("", response_model=list[WellListItem], summary="List available wells")
def list_wells(db: Session = Depends(get_db)) -> list[WellListItem]:
	"""Return a list of all 20 historical wells in the NWIS database with basic metadata."""
	wells = list_all_wells(db)
	return [WellListItem.model_validate(w) for w in wells]


@router.get("/{well_id}", response_model=WellDetailResponse, summary="Get well details")
def get_well(well_id: str, db: Session = Depends(get_db)) -> WellDetailResponse:
	"""Return comprehensive details for a specific well including formations, recent drilling logs, and historical events."""
	details = get_well_details(db, well_id)
	return WellDetailResponse.model_validate(details)


@router.get(
	"/{well_id}/similar",
	response_model=SimilarityResponse,
	summary="Get nearby similar wells",
)
def get_well_similar(
	well_id: str,
	radius_km: float = Query(default=10.0, ge=1, le=100),
	limit: int = Query(default=5, ge=1, le=20),
	db: Session = Depends(get_db),
) -> SimilarityResponse:
	"""Find geographically and geologically similar offset wells using PostGIS and the similarity scoring engine."""
	result = get_well_similar_orchestration(db, well_id, radius_km=radius_km, limit=limit)
	return SimilarityResponse.model_validate(result)


@router.post(
	"/{well_id}/risk",
	response_model=RiskPredictResponse,
	summary="Predict drilling risk for a well",
)
def predict_well_risk(
	well_id: str,
	payload: RiskPredictRequest,
	db: Session = Depends(get_db),
) -> RiskPredictResponse:
	"""Validate well existence and predict multi-class drilling risk for specified operational parameters using the trained XGBoost model."""
	result = predict_well_risk_orchestration(db, well_id, payload.model_dump())
	return RiskPredictResponse.model_validate(result)


@router.get(
	"/{well_id}/intelligence",
	response_model=WellIntelligenceResponse,
	summary="Get unified well intelligence",
)
def get_intelligence(
	well_id: str,
	radius_km: float = Query(default=10.0, ge=1, le=100),
	similar_limit: int = Query(default=5, ge=1, le=20),
	db: Session = Depends(get_db),
) -> WellIntelligenceResponse:
	"""Orchestrated intelligence endpoint combining well metadata, geological formations, recent drilling logs, historical events, nearby similar wells, ML risk assessment, and native pgvector RAG historical context."""
	result = get_well_intelligence(
		db,
		well_id,
		radius_km=radius_km,
		similar_limit=similar_limit,
	)
	return WellIntelligenceResponse.model_validate(result)
