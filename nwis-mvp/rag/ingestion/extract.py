"""PDF text extraction using PyMuPDF."""

from __future__ import annotations

from pathlib import Path

import fitz

from rag.ingestion.chunking import clean_text


def extract_pdf_pages(path: Path | str) -> list[str]:
    pdf_path = Path(path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    pages: list[str] = []
    with fitz.open(pdf_path) as document:
        for page in document:
            pages.append(clean_text(page.get_text("text")))
    return pages


def extract_pdf_text(path: Path | str) -> str:
    return "\n\n".join(page for page in extract_pdf_pages(path) if page)
