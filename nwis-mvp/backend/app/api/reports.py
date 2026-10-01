from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.report_service import (
    generate_well_report_data,
    generate_well_report_pdf,
)

router = APIRouter(tags=["reports"])


@router.get("/reports/wells/{well_id}")
def get_well_report(
    well_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve comprehensive operational intelligence report data in structured JSON format."""
    report_data = generate_well_report_data(db=db, well_id=well_id)
    if not report_data:
        raise HTTPException(
            status_code=404,
            detail=f"Well '{well_id}' not found in operational database.",
        )
    return report_data


@router.get("/reports/wells/{well_id}/pdf")
def get_well_report_pdf(
    well_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """Generate and download a high-density professional PDF operational intelligence report."""
    report_data = generate_well_report_data(db=db, well_id=well_id)
    if not report_data:
        raise HTTPException(
            status_code=404,
            detail=f"Well '{well_id}' not found in operational database.",
        )

    try:
        pdf_bytes = generate_well_report_pdf(report_data)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compile PDF report for well '{well_id}': {exc}",
        ) from exc

    filename = f"NWIS_Operational_Report_{well_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
