from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.drilling_log import DrillingLog
from app.models.event import Event
from app.models.formation import Formation
from app.models.operational_alert import OperationalAlert
from app.models.well import Well
from app.services.risk_service import predict_drilling_risk
from app.services.similarity_engine import get_similar_wells
from rag.retrieval.retriever import retrieve

logger = logging.getLogger(__name__)


def generate_well_report_data(
    db: Session,
    well_id: str,
) -> dict[str, Any] | None:
    """Compile comprehensive structured operational intelligence report data for a well."""
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        return None

    # 1. Geological Formations
    formations = (
        db.query(Formation)
        .filter(Formation.well_id == well.id)
        .order_by(Formation.top_depth)
        .all()
    )

    # 2. Latest drilling telemetry log
    latest_log = (
        db.query(DrillingLog)
        .filter(DrillingLog.well_id == well.id)
        .order_by(desc(DrillingLog.depth))
        .first()
    )

    telemetry = {
        "depth": latest_log.depth if latest_log else well.total_depth,
        "rop": latest_log.rop if latest_log else 22.5,
        "wob": latest_log.wob if latest_log else 12.8,
        "rpm": latest_log.rpm if latest_log else 115.0,
        "torque": latest_log.torque if latest_log else 17.5,
        "standpipe_pressure": latest_log.standpipe_pressure if latest_log else 2640.0,
        "mud_density": latest_log.mud_density if latest_log else 1.15,
        "timestamp": latest_log.timestamp.isoformat() if latest_log and latest_log.timestamp else datetime.now(timezone.utc).isoformat(),
    }

    # 3. XGBoost Risk Assessment on latest telemetry
    risk_prediction = predict_drilling_risk(
        {
            "depth": telemetry["depth"],
            "rop": telemetry["rop"],
            "wob": telemetry["wob"],
            "rpm": telemetry["rpm"],
            "torque": telemetry["torque"],
            "standpipe_pressure": telemetry["standpipe_pressure"],
            "mud_density": telemetry["mud_density"],
        }
    )

    # 4. Operational Alerts for this well (active and recent)
    alerts = (
        db.query(OperationalAlert)
        .filter(OperationalAlert.well_id == well.well_id)
        .order_by(desc(OperationalAlert.created_at))
        .limit(10)
        .all()
    )

    # 5. Similar Offset Wells (via PostGIS + Multi-Factor Similarity Engine)
    try:
        _, similar_wells = get_similar_wells(session=db, well_id=well_id, radius_km=15.0, limit=5)
    except Exception as exc:
        logger.warning("Could not compute similar wells for report: %s", exc)
        similar_wells = []

    # 6. Historical Events on this well
    historical_events = (
        db.query(Event)
        .filter(Event.well_id == well.id)
        .order_by(desc(Event.depth))
        .all()
    )

    # 7. Grounded Historical Intelligence (pgvector RAG evidence)
    try:
        query_text = f"What historical drilling problems, stuck pipe, or mud loss occurred in or around well {well_id}?"
        retrieval_res = retrieve(
            session=db,
            question=query_text,
            top_k=4,
            filters={"well_id": well_id},
        )
        rag_chunks = retrieval_res.get("results", [])
    except Exception as exc:
        logger.warning("Could not query RAG evidence for report: %s", exc)
        rag_chunks = []

    return {
        "well": {
            "well_id": well.well_id,
            "field": well.field,
            "latitude": well.latitude,
            "longitude": well.longitude,
            "total_depth": well.total_depth,
            "well_type": well.well_type,
            "status": well.status,
        },
        "formations": [
            {
                "formation_name": f.formation_name,
                "top_depth": f.top_depth,
                "bottom_depth": f.bottom_depth,
                "lithology": f.lithology,
            }
            for f in formations
        ],
        "telemetry": telemetry,
        "risk": {
            "predicted_label": risk_prediction.get("predicted_label", "NORMAL"),
            "predicted_class": risk_prediction.get("predicted_class", 0),
            "probability": risk_prediction.get("probabilities", {}).get(
                risk_prediction.get("predicted_label", "NORMAL"), 0.95
            ),
            "probabilities": risk_prediction.get("probabilities", {}),
            "model_type": "XGBoost XGBClassifier (7 operational parameters)",
        },
        "alerts": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "severity": a.severity,
                "probability": a.probability,
                "status": a.status,
                "depth": a.depth,
                "source": a.source,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "recovery_time": a.recovery_time.isoformat() if a.recovery_time else None,
                "description": a.description,
            }
            for a in alerts
        ],
        "similar_wells": [
            {
                "well_id": s.get("well_id"),
                "field": s.get("field"),
                "similarity_score": s.get("similarity_score"),
                "distance_km": s.get("distance_km"),
                "total_depth": s.get("total_depth"),
                "well_type": s.get("well_type"),
            }
            for s in similar_wells
        ],
        "historical_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "depth": e.depth,
                "formation": e.formation,
                "description": e.description,
                "cause": e.cause,
                "mitigation": e.mitigation,
                "outcome": e.outcome,
            }
            for e in historical_events
        ],
        "rag_evidence": [
            {
                "source_title": c.get("document_name", "Operational Log"),
                "similarity": round(float(c.get("similarity", 0.0)), 4),
                "text": c.get("content", ""),
            }
            for c in rag_chunks
        ],
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_type": "SYNTHETIC",
            "system": "eRTMAC-NWIS (SIH 2026 PS121)",
        },
        "notice": (
            "NOTICE: This report uses synthetic demonstration data. Live drilling telemetry and "
            "operational alerts are simulated. Machine learning predictions represent model output "
            "and must not be interpreted as confirmed field incidents or real Oil India production SCADA."
        ),
    }


def generate_well_report_pdf(report_data: dict[str, Any]) -> bytes:
    """Generate a clean, high-density professional PDF operational intelligence report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#b45309"),  # Warm amber/brown
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )

    notice_style = ParagraphStyle(
        "NoticeText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#92400e"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    story = []

    well = report_data.get("well", {})
    well_id = well.get("well_id", "UNKNOWN")
    generated_at = report_data.get("metadata", {}).get("generated_at", "")[:19].replace("T", " ")

    # Document Header
    story.append(Paragraph("eRTMAC-NWIS · Operational Intelligence Report", title_style))
    story.append(
        Paragraph(
            f"Nearby Wells Intelligence System — SIH 2026 PS121 · Target Well: <b>{well_id}</b> · Generated: {generated_at} UTC",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 8))

    # Synthetic Benchmark Disclaimer Banner
    notice_text = report_data.get("notice", "")
    banner_table = Table(
        [[Paragraph(f"<b>SIMULATION DATA NOTICE:</b> {notice_text}", notice_style)]],
        colWidths=[540],
    )
    banner_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
                ("BORDER", (0, 0), (-1, -1), 1, colors.HexColor("#f59e0b")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # Section 1: Well Overview
    story.append(Paragraph("1. Well Profile & Subsurface Overview", section_heading))
    overview_data = [
        [
            Paragraph("<b>Well Identifier</b>", body_style),
            Paragraph(str(well.get("well_id")), body_style),
            Paragraph("<b>Operational Field</b>", body_style),
            Paragraph(str(well.get("field")), body_style),
        ],
        [
            Paragraph("<b>Well Type</b>", body_style),
            Paragraph(str(well.get("well_type")), body_style),
            Paragraph("<b>Well Status</b>", body_style),
            Paragraph(str(well.get("status")), body_style),
        ],
        [
            Paragraph("<b>Total Depth (TD)</b>", body_style),
            Paragraph(f"{well.get('total_depth', 0):,.1f} m", body_style),
            Paragraph("<b>Geographic Coordinates</b>", body_style),
            Paragraph(f"{well.get('latitude', 0):.4f}° N, {well.get('longitude', 0):.4f}° E", body_style),
        ],
    ]
    t_overview = Table(overview_data, colWidths=[120, 150, 120, 150])
    t_overview.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t_overview)
    story.append(Spacer(1, 10))

    # Section 2: Current Drilling Telemetry Snapshot & XGBoost Risk
    story.append(Paragraph("2. Telemetry Snapshot & Real-Time XGBoost Risk Assessment", section_heading))
    telemetry = report_data.get("telemetry", {})
    risk = report_data.get("risk", {})
    pred_label = risk.get("predicted_label", "NORMAL")
    prob_pct = risk.get("probability", 0.0) * 100

    risk_bg = "#dcfce7" if pred_label == "NORMAL" else "#fee2e2"
    risk_border = "#22c55e" if pred_label == "NORMAL" else "#ef4444"

    telemetry_table_data = [
        [
            Paragraph("<b>Depth</b>", body_style),
            Paragraph(f"{telemetry.get('depth', 0):,.1f} m", body_style),
            Paragraph("<b>Rate of Penetration (ROP)</b>", body_style),
            Paragraph(f"{telemetry.get('rop', 0):.1f} m/hr", body_style),
        ],
        [
            Paragraph("<b>Weight on Bit (WOB)</b>", body_style),
            Paragraph(f"{telemetry.get('wob', 0):.1f} kN", body_style),
            Paragraph("<b>Rotary Speed (RPM)</b>", body_style),
            Paragraph(f"{telemetry.get('rpm', 0):.0f} RPM", body_style),
        ],
        [
            Paragraph("<b>Torque</b>", body_style),
            Paragraph(f"{telemetry.get('torque', 0):.1f} kN·m", body_style),
            Paragraph("<b>Standpipe Pressure (SPP)</b>", body_style),
            Paragraph(f"{telemetry.get('standpipe_pressure', 0):,.0f} psi", body_style),
        ],
        [
            Paragraph("<b>Mud Density</b>", body_style),
            Paragraph(f"{telemetry.get('mud_density', 0):.3f} g/cm³", body_style),
            Paragraph("<b>XGBoost Prediction</b>", body_style),
            Paragraph(f"<b>{pred_label}</b> ({prob_pct:.1f}% confidence)", body_style),
        ],
    ]
    t_telemetry = Table(telemetry_table_data, colWidths=[120, 150, 120, 150])
    t_telemetry.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BACKGROUND", (3, 3), (3, 3), colors.HexColor(risk_bg)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t_telemetry)
    story.append(Spacer(1, 10))

    # Section 3: Operational Alerts
    story.append(Paragraph("3. Operational Alerts Log (Simulated Live Streaming)", section_heading))
    alerts = report_data.get("alerts", [])
    if alerts:
        alerts_header = [
            Paragraph("ID", table_header_style),
            Paragraph("Hazard Type", table_header_style),
            Paragraph("Severity", table_header_style),
            Paragraph("Confidence", table_header_style),
            Paragraph("Depth", table_header_style),
            Paragraph("Status", table_header_style),
            Paragraph("Timestamp (UTC)", table_header_style),
        ]
        alerts_rows = [alerts_header]
        for a in alerts[:6]:
            alerts_rows.append(
                [
                    Paragraph(f"ALT-{a.get('id')}", body_style),
                    Paragraph(str(a.get("event_type")), body_style),
                    Paragraph(str(a.get("severity")), body_style),
                    Paragraph(f"{a.get('probability', 0)*100:.1f}%", body_style),
                    Paragraph(f"{a.get('depth', 0):.1f} m", body_style),
                    Paragraph(str(a.get("status")), body_style),
                    Paragraph(str(a.get("created_at", ""))[:19].replace("T", " "), body_style),
                ]
            )
        t_alerts = Table(alerts_rows, colWidths=[45, 95, 65, 65, 65, 75, 130])
        t_alerts.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(t_alerts)
    else:
        story.append(Paragraph("<i>No operational alerts logged for this wellbore session.</i>", body_style))
    story.append(Spacer(1, 10))

    # Section 4: Similar Offset Wells (PostGIS Multi-Factor Spatial Matching)
    story.append(Paragraph("4. Nearby Offset Wells & Geological Similarity (PostGIS)", section_heading))
    similar_wells = report_data.get("similar_wells", [])
    if similar_wells:
        sim_header = [
            Paragraph("Offset Well", table_header_style),
            Paragraph("Field", table_header_style),
            Paragraph("Distance", table_header_style),
            Paragraph("Similarity Match", table_header_style),
            Paragraph("Total Depth", table_header_style),
            Paragraph("Well Type", table_header_style),
        ]
        sim_rows = [sim_header]
        for s in similar_wells:
            sim_rows.append(
                [
                    Paragraph(f"<b>{s.get('well_id')}</b>", body_style),
                    Paragraph(str(s.get("field")), body_style),
                    Paragraph(f"{s.get('distance_km', 0):.2f} km", body_style),
                    Paragraph(f"{s.get('similarity_score', 0)*100:.1f}%", body_style),
                    Paragraph(f"{s.get('total_depth', 0):,.0f} m", body_style),
                    Paragraph(str(s.get("well_type")), body_style),
                ]
            )
        t_sim = Table(sim_rows, colWidths=[70, 90, 80, 100, 90, 110])
        t_sim.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),  # Petroleum teal
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(t_sim)
    else:
        story.append(Paragraph("<i>No nearby offset wells found within proximity radius.</i>", body_style))
    story.append(Spacer(1, 10))

    # Section 5: Historical Drilling Incidents
    story.append(Paragraph("5. Historical Incidents & Mitigation Records", section_heading))
    hist_events = report_data.get("historical_events", [])
    if hist_events:
        hist_header = [
            Paragraph("Event Type", table_header_style),
            Paragraph("Severity", table_header_style),
            Paragraph("Depth", table_header_style),
            Paragraph("Formation", table_header_style),
            Paragraph("Cause & Mitigation Summary", table_header_style),
        ]
        hist_rows = [hist_header]
        for e in hist_events[:5]:
            summary_txt = f"{e.get('description') or ''} Cause: {e.get('cause') or 'N/A'}. Mitigation: {e.get('mitigation') or 'N/A'}."
            hist_rows.append(
                [
                    Paragraph(str(e.get("event_type")), body_style),
                    Paragraph(str(e.get("severity")), body_style),
                    Paragraph(f"{e.get('depth', 0):.0f} m", body_style),
                    Paragraph(str(e.get("formation") or "N/A"), body_style),
                    Paragraph(summary_txt[:140] + ("..." if len(summary_txt) > 140 else ""), body_style),
                ]
            )
        t_hist = Table(hist_rows, colWidths=[80, 60, 50, 70, 280])
        t_hist.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(t_hist)
    else:
        story.append(Paragraph("<i>No historical incidents recorded on this wellbore.</i>", body_style))
    story.append(Spacer(1, 10))

    # Section 6: Grounded Historical Intelligence (RAG Evidence)
    story.append(Paragraph("6. Grounded Historical Intelligence (pgvector 384-D Cosine Search)", section_heading))
    rag_chunks = report_data.get("rag_evidence", [])
    if rag_chunks:
        for idx, chunk in enumerate(rag_chunks[:3], 1):
            source = chunk.get("source_title", "Document")
            sim = chunk.get("similarity", 0.0) * 100
            txt = chunk.get("text", "")[:220].strip()
            item_p = Paragraph(
                f"<b>[{idx}] {source}</b> (Match: {sim:.1f}%):<br/>{txt}...",
                body_style,
            )
            story.append(item_p)
            story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("<i>No matching historical documents retrieved for this wellbore context.</i>", body_style))

    # Footer note
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "eRTMAC-NWIS · Nearby Wells Intelligence System · Smart India Hackathon 2026 (PS121) · Oil India Limited context · Automated Technical Dossier",
            subtitle_style,
        )
    )

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
