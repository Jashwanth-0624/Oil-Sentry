from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RagDocument(Base):
	"""Stored RAG chunk with native pgvector(384) embedding."""

	__tablename__ = "rag_documents"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	document_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
	well_id: Mapped[str | None] = mapped_column(String, index=True)
	field: Mapped[str | None] = mapped_column(String, index=True)
	page_number: Mapped[int | None] = mapped_column(Integer)
	chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
	content: Mapped[str] = mapped_column(Text, nullable=False)
	embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)
	chunk_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)

