from fastapi import APIRouter

from app.schemas.risk import RiskPredictRequest, RiskPredictResponse
from app.services.risk_service import predict_drilling_risk

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/predict", response_model=RiskPredictResponse)
def predict_risk(payload: RiskPredictRequest) -> RiskPredictResponse:
    result = predict_drilling_risk(payload.model_dump())
    return RiskPredictResponse.model_validate(result)
