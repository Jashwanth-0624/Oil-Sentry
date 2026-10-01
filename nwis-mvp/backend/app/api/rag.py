from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.rag import RagQueryRequest, RagQueryResponse
from app.services.rag_service import query_historical_knowledge

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/query", response_model=RagQueryResponse)
def query_rag(payload: RagQueryRequest, db: Session = Depends(get_db)) -> RagQueryResponse:
	result = query_historical_knowledge(
		db,
		question=payload.question,
		top_k=payload.top_k,
		well_id=payload.well_id,
		field=payload.field,
		formation=payload.formation,
	)
	return RagQueryResponse.model_validate(result)
