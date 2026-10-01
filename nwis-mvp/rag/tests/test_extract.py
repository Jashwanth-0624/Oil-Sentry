from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from rag.ingestion.extract import extract_pdf_pages, extract_pdf_text


def test_extract_pdf_pages(tmp_path: Path) -> None:
    pdf_path = tmp_path / "W099_drilling_report.pdf"
    writer = canvas.Canvas(str(pdf_path), pagesize=A4)
    writer.drawString(72, 720, "SYNTHETIC DEVELOPMENT DOCUMENT")
    writer.drawString(72, 700, "Well ID: W099. Field: Field-A.")
    writer.showPage()
    writer.drawString(72, 720, "Event: HIGH_TORQUE at 2100 m. Mitigation: adjusted WOB/RPM.")
    writer.save()

    pages = extract_pdf_pages(pdf_path)
    text = extract_pdf_text(pdf_path)
    assert len(pages) == 2
    assert "W099" in text
    assert "HIGH_TORQUE" in text
    assert "SYNTHETIC DEVELOPMENT DOCUMENT" in text
