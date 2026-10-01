from rag.ingestion.chunking import (
    build_chunk_records,
    clean_text,
    detect_formations,
    detect_well_id,
    split_into_chunks,
)


def test_clean_text_collapses_whitespace() -> None:
    assert clean_text("Well   W001\n\n\nField-A") == "Well W001\n\nField-A"


def test_split_into_chunks_uses_overlap() -> None:
    words = [f"word{i}" for i in range(20)]
    chunks = split_into_chunks(" ".join(words), chunk_size=8, overlap_words=2)
    assert len(chunks) == 3
    assert chunks[0].split()[-2:] == chunks[1].split()[:2]


def test_detect_metadata_from_report_text() -> None:
    text = "Well ID: W005. Field: Field-A. Formation-C Depth: 3200-3500 m. Event: HIGH_TORQUE."
    assert detect_well_id(text) == "W005"
    assert detect_formations(text) == ["Formation-C"]


def test_chunk_records_retain_source_metadata() -> None:
    pages = [
        "Well ID: W007. Field: Field-B. Formation-B interval 1200-1600 m. Stuck pipe occurred.",
        "Mitigation used circulation and WOB reduction. Outcome: drilling resumed.",
    ]
    records = build_chunk_records("W007_drilling_report.pdf", pages, chunk_size=20, overlap_words=2)
    assert records
    assert records[0]["document_name"] == "W007_drilling_report.pdf"
    assert records[0]["well_id"] == "W007"
    assert records[0]["field"] == "Field-B"
    assert records[0]["chunk_index"] == 0
    assert records[0]["page_number"] >= 1
