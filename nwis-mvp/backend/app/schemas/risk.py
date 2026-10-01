from typing import Annotated

from pydantic import BaseModel, Field, model_validator

PositiveMeasurement = Annotated[float, Field(gt=0, allow_inf_nan=False)]


class MessageResponse(BaseModel):
    message: str


class RiskPredictRequest(BaseModel):
    depth: PositiveMeasurement
    rop: PositiveMeasurement
    wob: PositiveMeasurement
    rpm: PositiveMeasurement
    torque: PositiveMeasurement
    standpipe_pressure: PositiveMeasurement
    mud_density: PositiveMeasurement


class RiskProbabilities(BaseModel):
    NORMAL: float
    STUCK_PIPE: float
    MUD_LOSS: float
    HIGH_TORQUE: float

    @model_validator(mode="after")
    def validate_probability_range(self) -> "RiskProbabilities":
        values = [self.NORMAL, self.STUCK_PIPE, self.MUD_LOSS, self.HIGH_TORQUE]
        if any(value < 0 or value > 1 for value in values):
            raise ValueError("Probabilities must be between 0 and 1")
        return self


class RiskSummary(BaseModel):
    predicted_label: str
    risk_probability: float = Field(ge=0, le=1)


class RiskPredictResponse(BaseModel):
    predicted_class: int = Field(ge=0, le=3)
    predicted_label: str
    probabilities: RiskProbabilities
    risk_summary: RiskSummary
