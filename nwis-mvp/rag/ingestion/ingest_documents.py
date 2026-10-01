"""Ingest synthetic well-report PDFs into PostgreSQL."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.database import SessionLocal, engine  # noqa: E402
from app.models import RagDocument  # noqa: E402
from rag.ingestion.chunking import build_chunk_records  # noqa: E402
from rag.ingestion.embeddings import DEFAULT_EMBEDDING_MODEL, get_embedding_model  # noqa: E402
from rag.ingestion.extract import extract_pdf_pages  # noqa: E402
from rag.pgvector_status import try_enable_pgvector  # noqa: E402

DOCUMENTS_DIR = PROJECT_ROOT / "rag" / "documents"


def well_id_from_filename(name: str) -> str | None:
    match = re.search(r"(W\d{3})", name)
    return match.group(1) if match else None


def rebuild_rag_table(session: Session) -> None:
    session.execute(text("DROP TABLE IF EXISTS rag_documents"))
    session.commit()
    RagDocument.__table__.create(bind=session.get_bind())


def ingest_documents(
    session: Session,
    documents_dir: Path = DOCUMENTS_DIR,
    model_name: str = DEFAULT_EMBEDDING_MODEL,
) -> dict[str, object]:
    pdf_paths = sorted(documents_dir.glob("*_drilling_report.pdf"))
    if not pdf_paths:
        raise FileNotFoundError(f"No synthetic well-report PDFs found in {documents_dir}")

    bind = session.get_bind()
    pgvector = try_enable_pgvector(bind)
    if not pgvector.enabled:
        raise RuntimeError(f"pgvector is required but not enabled: {pgvector.error}")
    print(f"pgvector enabled and active. Version={pgvector.installed}")

    embedder = get_embedding_model(model_name)
    dimension = embedder.dimension
    print(f"Embedding model: {embedder.model_name}")
    print(f"Embedding dimension: {dimension}")

    rebuild_rag_table(session)

    all_records: list[dict] = []
    for pdf_path in pdf_paths:
        pages = extract_pdf_pages(pdf_path)
        records = build_chunk_records(
            document_name=pdf_path.name,
            pages=pages,
            well_id=well_id_from_filename(pdf_path.name),
        )
        if not records:
            print(f"Skipped empty PDF: {pdf_path.name}")
            continue
        vectors = embedder.embed_texts([item["content"] for item in records])
        if len(vectors) != len(records):
            raise RuntimeError(f"Embedding count mismatch for {pdf_path.name}")
        if vectors and len(vectors[0]) != dimension:
            raise RuntimeError(
                f"Embedding dimension {len(vectors[0])} does not match model dimension {dimension}"
            )
        for record, vector in zip(records, vectors, strict=True):
            metadata = dict(record["metadata"])
            metadata["embedding_model"] = embedder.model_name
            metadata["embedding_dimension"] = dimension
            metadata["pgvector_enabled"] = pgvector.enabled
            session.add(
                RagDocument(
                    document_name=record["document_name"],
                    well_id=record["well_id"],
                    field=record["field"],
                    page_number=record["page_number"],
                    chunk_index=record["chunk_index"],
                    content=record["content"],
                    embedding=vector,
                    chunk_metadata=metadata,
                )
            )
            all_records.append(record)
        print(f"Ingested {pdf_path.name}: {len(records)} chunk(s)")

    session.commit()
    chunk_count = session.query(RagDocument).count()
    document_count = session.query(RagDocument.document_name).distinct().count()
    summary = {
        "documents": document_count,
        "chunks": chunk_count,
        "embedding_model": embedder.model_name,
        "embedding_dimension": dimension,
        "pgvector_enabled": pgvector.enabled,
        "pgvector_error": pgvector.error,
    }
    print(
        f"Ingest complete: {summary['documents']} documents, {summary['chunks']} chunks, "
        f"dimension={dimension}, pgvector_enabled={pgvector.enabled}"
    )
    return summary


def main() -> None:
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    session = SessionLocal()
    try:
        ingest_documents(session)
    finally:
        session.close()


if __name__ == "__main__":
    main()
