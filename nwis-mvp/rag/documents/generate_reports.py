"""Generate synthetic historical well PDFs from the existing NWIS database."""

from __future__ import annotations

import statistics
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session, selectinload  # noqa: E402

from app.core.database import SessionLocal, engine  # noqa: E402
from app.models import DrillingLog, Event, Formation, Well  # noqa: E402

DOCUMENTS_DIR = Path(__file__).resolve().parent
DISCLAIMER = (
    "SYNTHETIC DEVELOPMENT DOCUMENT. This report is generated from the NWIS MVP "
    "synthetic database for demonstration and testing. It is NOT a real Oil India "
    "Limited drilling report and must not be treated as operational or confidential "
    "OIL material."
)


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Heading1"],
            fontSize=16,
            spaceAfter=8,
        ),
        "heading": ParagraphStyle(
            "ReportHeading",
            parent=base["Heading2"],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=base["BodyText"],
            fontSize=10,
            leading=13,
            spaceAfter=6,
        ),
        "warn": ParagraphStyle(
            "ReportWarn",
            parent=base["BodyText"],
            fontSize=9,
            leading=12,
            spaceAfter=10,
        ),
    }


def _mean(values: list[float]) -> str:
    if not values:
        return "not recorded"
    return f"{statistics.mean(values):.2f}"


def _formation_observations(formation: Formation, logs: list[DrillingLog]) -> str:
    top = formation.top_depth
    bottom = formation.bottom_depth
    interval_logs: list[DrillingLog] = []
    for log in logs:
        if log.depth is None or top is None or bottom is None:
            continue
        if min(top, bottom) <= log.depth <= max(top, bottom):
            interval_logs.append(log)

    if not interval_logs:
        return (
            f"No synthetic drilling-log samples were recorded inside "
            f"{formation.formation_name} ({_fmt_depth(top)}-{_fmt_depth(bottom)} m)."
        )

    rop = [log.rop for log in interval_logs if log.rop is not None]
    wob = [log.wob for log in interval_logs if log.wob is not None]
    rpm = [log.rpm for log in interval_logs if log.rpm is not None]
    torque = [log.torque for log in interval_logs if log.torque is not None]
    spp = [log.standpipe_pressure for log in interval_logs if log.standpipe_pressure is not None]
    mud = [log.mud_density for log in interval_logs if log.mud_density is not None]
    non_normal = sum(1 for log in interval_logs if log.event_label and log.event_label != 0)
    return (
        f"Drilling observations in {formation.formation_name} "
        f"({_fmt_depth(top)}-{_fmt_depth(bottom)} m, lithology {formation.lithology or 'unspecified'}): "
        f"{len(interval_logs)} synthetic log samples. "
        f"Mean ROP {_mean(rop)} m/h, mean WOB {_mean(wob)}, mean RPM {_mean(rpm)}, "
        f"mean torque {_mean(torque)}, mean standpipe pressure {_mean(spp)}, "
        f"mean mud density {_mean(mud)}. "
        f"Non-normal event_label rows in this interval: {non_normal}."
    )


def _fmt_depth(value: float | None) -> str:
    if value is None:
        return "unknown"
    return f"{value:.1f}"


def _event_paragraph(event: Event) -> str:
    return (
        f"Historical event at {_fmt_depth(event.depth)} m in "
        f"{event.formation or 'an unspecified formation'}. "
        f"Event type: {event.event_type}. Severity: {event.severity}. "
        f"Observation: {event.description or 'not recorded'}. "
        f"Cause: {event.cause or 'not recorded'}. "
        f"Mitigation: {event.mitigation or 'not recorded'}. "
        f"Outcome: {event.outcome or 'not recorded'}."
    )


def build_report_story(well: Well) -> list:
    styles = _styles()
    story = [
        Paragraph("Synthetic Historical Well Drilling Report", styles["title"]),
        Paragraph(DISCLAIMER, styles["warn"]),
        Paragraph("Well identification", styles["heading"]),
        Paragraph(
            f"Well ID: {well.well_id}. Field: {well.field or 'unspecified'}. "
            f"Well type: {well.well_type or 'unspecified'}. Status: {well.status or 'unspecified'}. "
            f"Total depth: {_fmt_depth(well.total_depth)} m. "
            f"Surface location (synthetic): latitude {well.latitude}, longitude {well.longitude}.",
            styles["body"],
        ),
        Paragraph("Formation intervals", styles["heading"]),
    ]

    formations = sorted(
        well.formations,
        key=lambda item: (item.top_depth is None, item.top_depth or 0.0),
    )
    if not formations:
        story.append(
            Paragraph(
                "No formation intervals are recorded for this well in the synthetic database.",
                styles["body"],
            )
        )
    else:
        for formation in formations:
            story.append(
                Paragraph(
                    f"{formation.formation_name}: {_fmt_depth(formation.top_depth)}-"
                    f"{_fmt_depth(formation.bottom_depth)} m. Lithology: "
                    f"{formation.lithology or 'unspecified'}. Pressure: "
                    f"{formation.pressure if formation.pressure is not None else 'not recorded'}. "
                    f"Temperature: {formation.temperature if formation.temperature is not None else 'not recorded'}.",
                    styles["body"],
                )
            )

    story.append(Paragraph("Drilling observations", styles["heading"]))
    logs = list(well.drilling_logs)
    if not logs:
        story.append(
            Paragraph(
                "No synthetic drilling logs are recorded for this well.",
                styles["body"],
            )
        )
    else:
        story.append(
            Paragraph(
                f"This well has {len(logs)} synthetic drilling-log samples in the NWIS database. "
                "The following observations summarize those records by formation interval. "
                "No additional drilling events are inferred beyond the stored logs and events table.",
                styles["body"],
            )
        )
        for formation in formations:
            story.append(Paragraph(_formation_observations(formation, logs), styles["body"]))

    story.append(Paragraph("Historical events", styles["heading"]))
    events = sorted(well.events, key=lambda item: (item.depth is None, item.depth or 0.0))
    if not events:
        story.append(
            Paragraph(
                "No historical drilling events are recorded for this well in the synthetic events table.",
                styles["body"],
            )
        )
    else:
        story.append(
            Paragraph(
                f"{len(events)} historical event record(s) are stored for {well.well_id}. "
                "Each item below is copied from the synthetic events table.",
                styles["body"],
            )
        )
        for event in events:
            story.append(Paragraph(_event_paragraph(event), styles["body"]))

    story.append(Paragraph("Source statement", styles["heading"]))
    story.append(
        Paragraph(
            "All well, formation, drilling-log, and event values in this PDF were copied from "
            "the local NWIS synthetic PostgreSQL database. The document does not add wells, "
            "depths, causes, mitigations, or outcomes that are absent from those tables.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    return story


def write_well_pdf(well: Well, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        title=f"Synthetic drilling report {well.well_id}",
        author="eRTMAC-NWIS synthetic generator",
    )
    document.build(build_report_story(well))
    return output_path


def generate_reports(session: Session, output_dir: Path = DOCUMENTS_DIR) -> list[Path]:
    wells = session.scalars(
        select(Well)
        .options(
            selectinload(Well.formations),
            selectinload(Well.events),
            selectinload(Well.drilling_logs),
        )
        .order_by(Well.well_id)
    ).all()
    if not wells:
        raise RuntimeError("No wells found in the database. Load the synthetic dataset first.")

    written: list[Path] = []
    for well in wells:
        path = output_dir / f"{well.well_id}_drilling_report.pdf"
        write_well_pdf(well, path)
        written.append(path)
        print(f"Wrote {path.name}")
    return written


def main() -> None:
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    session = SessionLocal()
    try:
        paths = generate_reports(session)
        print(f"Generated {len(paths)} synthetic well reports in {DOCUMENTS_DIR}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
