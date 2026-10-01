from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.similarity import SimilarityResponse
from app.services.similarity_engine import get_similar_wells

router = APIRouter()


@router.get("/similarity/{well_id}", response_model=SimilarityResponse)
def get_similarity(
    well_id: str,
    radius_km: float = Query(default=10.0, ge=1, le=100),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
) -> SimilarityResponse:
    current_well, results = get_similar_wells(db, well_id, radius_km=radius_km, limit=limit)
    if current_well is None:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

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

    return SimilarityResponse(
        current_well={
            "well_id": current_well.well_id,
            "field": current_well.field,
            "latitude": current_well.latitude,
            "longitude": current_well.longitude,
            "total_depth": current_well.total_depth,
        },
        search_radius_km=radius_km,
        results=valid_results,
    )
