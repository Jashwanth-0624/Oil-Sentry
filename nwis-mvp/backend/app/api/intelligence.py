"""Grounded generation endpoint built above existing intelligence retrieval."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.intelligence import IntelligenceQueryRequest, IntelligenceQueryResponse
from app.services.intelligence_service import generate_intelligence_response

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

@router.post("/query", response_model=IntelligenceQueryResponse)
def query_intelligence(payload: IntelligenceQueryRequest, db: Session = Depends(get_db)) -> IntelligenceQueryResponse:
    return IntelligenceQueryResponse.model_validate(generate_intelligence_response(db, payload.well_id.upper(), payload.question))
