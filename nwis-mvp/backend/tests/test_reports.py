from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_well_report_json_endpoint() -> None:
    """Verify structured operational intelligence JSON report generation."""
    response = client.get("/api/reports/wells/W001")
    assert response.status_code == 200
    data = response.json()

    # Verify all mandatory sections
    assert "well" in data
    assert data["well"]["well_id"] == "W001"
    assert "field" in data["well"]
    assert "total_depth" in data["well"]

    assert "formations" in data
    assert isinstance(data["formations"], list)

    assert "telemetry" in data
    for param in ["depth", "rop", "wob", "rpm", "torque", "standpipe_pressure", "mud_density"]:
        assert param in data["telemetry"]

    assert "risk" in data
    assert "predicted_label" in data["risk"]
    assert "probability" in data["risk"]
    assert "probabilities" in data["risk"]

    assert "alerts" in data
    assert isinstance(data["alerts"], list)

    assert "similar_wells" in data
    assert isinstance(data["similar_wells"], list)

    assert "historical_events" in data
    assert isinstance(data["historical_events"], list)

    assert "rag_evidence" in data
    assert isinstance(data["rag_evidence"], list)

    assert "notice" in data
    assert "SIMULATED" in data["notice"].upper() or "SYNTHETIC" in data["notice"].upper()

    assert "metadata" in data
    assert data["metadata"]["data_type"] == "SYNTHETIC"


def test_well_report_unknown_well_404() -> None:
    """Verify 404 response for unknown well."""
    response = client.get("/api/reports/wells/W999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_well_report_pdf_endpoint() -> None:
    """Verify PDF operational report endpoint generates valid PDF document."""
    response = client.get("/api/reports/wells/W001/pdf")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "inline" in response.headers.get("content-disposition", "")
    assert "NWIS_Operational_Report_W001.pdf" in response.headers.get("content-disposition", "")

    # PDF binary signature check (%PDF-...)
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1000  # Non-empty document


def test_well_report_pdf_unknown_well_404() -> None:
    """Verify 404 for PDF generation on invalid well."""
    response = client.get("/api/reports/wells/W999/pdf")
    assert response.status_code == 404
