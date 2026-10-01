"""Deterministic word-based chunking for synthetic drilling reports."""

from __future__ import annotations

import re
from typing import Any

DEFAULT_CHUNK_WORDS = 650
DEFAULT_OVERLAP_WORDS = 80


def clean_text(text: str) -> str:
    cleaned = text.replace("\x00", " ")
    cleaned = cleaned.replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def detect_well_id(text: str, fallback: str | None = None) -> str | None:
    match = re.search(r"\b(W\d{3})\b", text)
    if match:
        return match.group(1)
    return fallback


def detect_field(text: str) -> str | None:
    match = re.search(r"Field:\s*(Field-[A-Z])", text)
    if match:
        return match.group(1)
    match = re.search(r"\b(Field-[A-Z])\b", text)
    return match.group(1) if match else None


def detect_formations(text: str) -> list[str]:
    found = re.findall(r"\bFormation-[A-E]\b", text)
    unique: list[str] = []
    for name in found:
        if name not in unique:
            unique.append(name)
    return unique


def detect_depth_mentions(text: str) -> list[str]:
    return re.findall(r"\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*m|\d+(?:\.\d+)?\s*m", text)[:8]


def split_into_chunks(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_WORDS,
    overlap_words: int = DEFAULT_OVERLAP_WORDS,
) -> list[str]:
    words = clean_text(text).split()
    if not words:
        return []
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap_words < 0 or overlap_words >= chunk_size:
        raise ValueError("overlap_words must be >= 0 and smaller than chunk_size")

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - overlap_words
    return chunks


def assign_page_number(chunk: str, pages: list[str]) -> int:
    if not pages:
        return 1
    probe = " ".join(chunk.split()[:12])
    for index, page_text in enumerate(pages, start=1):
        if probe and probe in " ".join(page_text.split()):
            return index
    return 1


def build_chunk_records(
    document_name: str,
    pages: list[str],
    well_id: str | None = None,
    field: str | None = None,
    chunk_size: int = DEFAULT_CHUNK_WORDS,
    overlap_words: int = DEFAULT_OVERLAP_WORDS,
) -> list[dict[str, Any]]:
    cleaned_pages = [clean_text(page) for page in pages if clean_text(page)]
    full_text = "\n\n".join(cleaned_pages)
    well_id = detect_well_id(full_text, well_id)
    field = field or detect_field(full_text)
    records: list[dict[str, Any]] = []
    for index, content in enumerate(split_into_chunks(full_text, chunk_size, overlap_words)):
        formations = detect_formations(content)
        records.append(
            {
                "document_name": document_name,
                "well_id": well_id,
                "field": field,
                "page_number": assign_page_number(content, cleaned_pages),
                "chunk_index": index,
                "content": content,
                "metadata": {
                    "formations": formations,
                    "depth_mentions": detect_depth_mentions(content),
                    "source_page": assign_page_number(content, cleaned_pages),
                },
            }
        )
    return records
