from sqlalchemy import func, inspect, text

from app.core.database import SessionLocal, engine
from app.models import DrillingLog, Event, Formation, RagDocument, Well
from rag.retrieval.retriever import retrieve


def test_core_tables_were_not_replaced() -> None:
    assert engine is not None
    inspector = inspect(engine)
    names = set(inspector.get_table_names())
    for table in ("wells", "formations", "drilling_logs", "events"):
        assert table in names
    session = SessionLocal()
    try:
        assert session.query(func.count(Well.id)).scalar() == 20
        assert session.query(func.count(Formation.id)).scalar() == 86
        assert session.query(func.count(DrillingLog.id)).scalar() == 3000
        assert session.query(func.count(Event.id)).scalar() == 43
    finally:
        session.close()


def test_rag_chunks_exist_with_embeddings() -> None:
    session = SessionLocal()
    try:
        count = session.query(func.count(RagDocument.id)).scalar()
        assert count == 20
        row = session.query(RagDocument).first()
        assert row is not None
        assert row.embedding is not None
        assert len(row.embedding) == 384
        assert row.document_name.endswith("_drilling_report.pdf")
        assert row.well_id
        assert row.well_id.startswith("W")
    finally:
        session.close()


def test_retrieval_returns_matching_well_ids() -> None:
    session = SessionLocal()
    try:
        result = retrieve(session, "What problems occurred in W005?", top_k=5, min_similarity=0.1)
        chunks = result["results"]
        assert chunks
        well_ids = {item["well_id"] for item in chunks}
        assert "W005" in well_ids
        for item in chunks:
            assert item["document_name"].endswith("_drilling_report.pdf")
            assert item["document_name"].startswith(item["well_id"])
            assert "similarity" in item
            assert chunks == sorted(chunks, key=lambda row: row["similarity"], reverse=True)
    finally:
        session.close()


def test_stuck_pipe_query_retrieves_relevant_sources() -> None:
    session = SessionLocal()
    try:
        result = retrieve(
            session,
            "What mitigation was used when stuck pipe occurred?",
            top_k=5,
            min_similarity=0.1,
        )
        chunks = result["results"]
        assert chunks
        joined = " ".join(item["content"] for item in chunks).upper()
        assert "STUCK_PIPE" in joined or "STUCK PIPE" in joined
        for item in chunks:
            assert item["document_name"].endswith("_drilling_report.pdf")
    finally:
        session.close()


def test_no_evidence_threshold_filters_unrelated_questions() -> None:
    session = SessionLocal()
    try:
        result = retrieve(
            session,
            "How do I bake a chocolate cake with strawberries?",
            top_k=5,
            min_similarity=0.55,
        )
        assert result["results"] == []
    finally:
        session.close()


def test_pgvector_status_is_reported() -> None:
    session = SessionLocal()
    try:
        result = retrieve(session, "historical drilling events", top_k=3, min_similarity=0.0)
        assert result["pgvector_enabled"] is True
        assert result["retrieval_backend"] == "pgvector_cosine"
        assert result["pgvector_error"] is None
    finally:
        session.close()


def test_rag_rebuild_did_not_delete_operational_tables() -> None:
    assert engine is not None
    with engine.connect() as connection:
        wells = connection.execute(text("SELECT COUNT(*) FROM wells")).scalar()
        events = connection.execute(text("SELECT COUNT(*) FROM events")).scalar()
    assert wells == 20
    assert events == 43
