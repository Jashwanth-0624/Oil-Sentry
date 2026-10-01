from __future__ import annotations

import math

from geoalchemy2 import Geography
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Formation, Well


MAX_RADIUS_KM = 100
MAX_LIMIT = 20


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return 0.0

    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def calculate_geological_similarity(current_formations: list[Formation], candidate_formations: list[Formation]) -> float:
    current_lookup = {formation.formation_name: formation for formation in current_formations}
    candidate_lookup = {formation.formation_name: formation for formation in candidate_formations}
    shared_names = sorted(set(current_lookup) & set(candidate_lookup))

    if not shared_names:
        return 0.0

    scores: list[float] = []
    for name in shared_names:
        curr = current_lookup[name]
        cand = candidate_lookup[name]
        lithology_score = 1.0 if curr.lithology == cand.lithology else 0.0

        pressure_score = 0.0
        if curr.pressure is not None and cand.pressure is not None and curr.pressure != 0 and cand.pressure != 0:
            delta = abs(curr.pressure - cand.pressure)
            pressure_score = max(0.0, 1.0 - delta / max(abs(curr.pressure), abs(cand.pressure), 1.0))

        temperature_score = 0.0
        if curr.temperature is not None and cand.temperature is not None and curr.temperature != 0 and cand.temperature != 0:
            delta = abs(curr.temperature - cand.temperature)
            temperature_score = max(0.0, 1.0 - delta / max(abs(curr.temperature), abs(cand.temperature), 1.0))

        scores.append((lithology_score + pressure_score + temperature_score) / 3.0)

    return sum(scores) / len(scores)


def calculate_similarity_scores(current_well: Well, candidate_well: Well, radius_km: float) -> dict[str, float | list[str]]:
    current_depth = current_well.total_depth or 0.0
    candidate_depth = candidate_well.total_depth or 0.0
    if current_depth <= 0:
        depth_similarity = 0.0
    else:
        depth_similarity = max(0.0, 1.0 - abs(current_depth - candidate_depth) / current_depth)

    if current_well.latitude is not None and current_well.longitude is not None and candidate_well.latitude is not None and candidate_well.longitude is not None:
        distance_km = haversine_km(
            float(current_well.latitude),
            float(current_well.longitude),
            float(candidate_well.latitude),
            float(candidate_well.longitude),
        )
    else:
        distance_km = 0.0

    distance_similarity = max(0.0, 1.0 - distance_km / max(radius_km, 1.0))

    current_formations = list(current_well.formations)
    candidate_formations = list(candidate_well.formations)
    current_names = {formation.formation_name for formation in current_formations}
    candidate_names = {formation.formation_name for formation in candidate_formations}
    common_names = sorted(current_names & candidate_names)
    formation_similarity = 0.0
    if current_names:
        formation_similarity = len(common_names) / len(current_names)

    geological_similarity = calculate_geological_similarity(current_formations, candidate_formations)

    final_score = (
        distance_similarity * 0.40
        + formation_similarity * 0.30
        + depth_similarity * 0.20
        + geological_similarity * 0.10
    )

    return {
        "distance_km": float(distance_km),
        "distance_similarity": float(distance_similarity),
        "formation_similarity": float(formation_similarity),
        "depth_similarity": float(depth_similarity),
        "geological_similarity": float(geological_similarity),
        "similarity_score": max(0.0, min(1.0, float(final_score))),
        "common_formations": common_names,
    }


def get_similar_wells(
    session: Session,
    well_id: str,
    radius_km: float = 10.0,
    limit: int = 5,
) -> tuple[Well | None, list[dict[str, float | list[str] | str | None]]]:
    if radius_km <= 0 or radius_km > MAX_RADIUS_KM:
        raise ValueError(f"radius_km must be between 1 and {MAX_RADIUS_KM}")
    if limit <= 0 or limit > MAX_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_LIMIT}")

    current_well = session.scalar(select(Well).where(Well.well_id == well_id))
    if current_well is None:
        return None, []

    current_well_formations = session.scalars(
        select(Formation).where(Formation.well_id == current_well.id)
    ).all()
    current_well.formations = current_well_formations

    nearby_query = (
        select(Well)
        .options(selectinload(Well.formations))
        .where(Well.id != current_well.id)
        .where(
            func.ST_DWithin(
                Well.location.cast(Geography),
                func.ST_SetSRID(func.ST_MakePoint(current_well.longitude, current_well.latitude), 4326).cast(Geography),
                radius_km * 1000,
            )
        )
        .order_by(
            func.ST_Distance(
                Well.location.cast(Geography),
                func.ST_SetSRID(func.ST_MakePoint(current_well.longitude, current_well.latitude), 4326).cast(Geography),
            )
        )
    )

    candidate_wells = session.scalars(nearby_query.limit(limit)).all()

    results: list[dict[str, float | list[str] | str | None]] = []
    for candidate in candidate_wells:
        candidate_scores = calculate_similarity_scores(current_well, candidate, radius_km)
        result = {
            "well_id": candidate.well_id,
            "field": candidate.field,
            "distance_km": candidate_scores["distance_km"],
            "similarity_score": float(candidate_scores["similarity_score"]) * 100,
            "distance_similarity": candidate_scores["distance_similarity"],
            "formation_similarity": candidate_scores["formation_similarity"],
            "depth_similarity": candidate_scores["depth_similarity"],
            "geological_similarity": candidate_scores["geological_similarity"],
            "common_formations": candidate_scores["common_formations"],
            "total_depth": candidate.total_depth,
            "well_type": candidate.well_type,
            "status": candidate.status,
        }
        results.append(result)

    results.sort(key=lambda item: float(item["similarity_score"]), reverse=True)
    return current_well, results[:limit]
