"""Semantic retrieval of historical report chunks using native PostgreSQL pgvector."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models import RagDocument  # noqa: E402
from rag.ingestion.embeddings import DEFAULT_EMBEDDING_MODEL, get_embedding_model  # noqa: E402
from rag.pgvector_status import get_pgvector_status  # noqa: E402

DEFAULT_TOP_K = 5
# Cosine similarity threshold on normalized MiniLM vectors.
# Note: cosine_similarity = 1.0 - cosine_distance.
# With pgvector <=> operator, lower distance means higher similarity.
DEFAULT_MIN_SIMILARITY = 0.10


def cosine_similarity(left: list[float], right: list[float]) -> float:
    """Helper for evaluating cosine similarity between two vector lists."""
    import numpy as np
    a = np.asarray(left, dtype=float)
    b = np.asarray(right, dtype=float)
    if a.size == 0 or b.size == 0 or a.shape != b.shape:
        return 0.0
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)



def retrieve(
    session: Session,
    question: str,
    top_k: int = DEFAULT_TOP_K,
    min_similarity: float = DEFAULT_MIN_SIMILARITY,
    filters: dict[str, str] | None = None,
    model_name: str = DEFAULT_EMBEDDING_MODEL,
) -> dict[str, Any]:
    if top_k < 1:
        raise ValueError("top_k must be >= 1")

    pgvector = get_pgvector_status(session)
    if not pgvector.enabled:
        raise RuntimeError(
            f"Native pgvector is required on PostgreSQL server but unavailable: {pgvector.error}"
        )

    embedder = get_embedding_model(model_name)
    query_vector = embedder.embed_query(question)

    # Native pgvector cosine distance: embedding <=> :query_vector
    # Lower distance indicates greater similarity.
    distance_col = RagDocument.embedding.cosine_distance(query_vector).label("distance")

    query = session.query(RagDocument, distance_col)

    if filters:
        well_id = filters.get("well_id")
        field = filters.get("field")
        formation = filters.get("formation")
        if well_id:
            query = query.filter(RagDocument.well_id == well_id)
        if field:
            query = query.filter(RagDocument.field == field)
        if formation:
            query = query.filter(RagDocument.content.ilike(f"%{formation}%"))

    # Database performs the vector similarity ordering and limits to top_k directly
    query = query.order_by(distance_col.asc()).limit(top_k)
    rows = query.all()

    top: list[dict[str, Any]] = []
    relevant: list[dict[str, Any]] = []

    for doc, dist in rows:
        distance = round(float(dist), 6)
        # Cosine similarity converted from distance: similarity = 1 - cosine_distance
        similarity = round(1.0 - distance, 6)
        item = {
            "document_name": doc.document_name,
            "well_id": doc.well_id,
            "field": doc.field,
            "content": doc.content,
            "page_number": doc.page_number,
            "chunk_index": doc.chunk_index,
            "distance": distance,
            "similarity": similarity,
            "metadata": doc.chunk_metadata,
        }
        top.append(item)
        if similarity >= min_similarity:
            relevant.append(item)

    return {
        "results": relevant,
        "raw_top": top,
        "pgvector_enabled": True,
        "pgvector_error": None,
        "retrieval_backend": "pgvector_cosine",
        "min_similarity": min_similarity,
        "top_k": top_k,
        "embedding_model": embedder.model_name,
        "embedding_dimension": embedder.dimension,
    }
