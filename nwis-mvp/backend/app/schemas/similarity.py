from pydantic import BaseModel, Field


class CurrentWell(BaseModel):
    well_id: str
    field: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    total_depth: float | None = None


class SimilarityResult(BaseModel):
    well_id: str
    field: str | None = None
    distance_km: float
    similarity_score: float = Field(..., ge=0, le=100)
    distance_similarity: float = Field(..., ge=0, le=1)
    formation_similarity: float = Field(..., ge=0, le=1)
    depth_similarity: float = Field(..., ge=0, le=1)
    geological_similarity: float = Field(..., ge=0, le=1)
    common_formations: list[str]
    total_depth: float | None = None
    well_type: str | None = None
    status: str | None = None


class SimilarityResponse(BaseModel):
    current_well: CurrentWell
    search_radius_km: float
    results: list[SimilarityResult]
