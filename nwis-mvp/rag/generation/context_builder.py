"""Build a bounded, evidence-only context for the generation layer."""

from __future__ import annotations

from typing import Any


def _clean(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _record(item: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: _clean(getattr(item, field, None) if not isinstance(item, dict) else item.get(field)) for field in fields}


def build_grounded_context(intelligence: dict[str, Any], alerts: list[Any] | None = None) -> dict[str, Any]:
    """Normalize already-retrieved project data; this function never queries a database."""
    well = intelligence["well"]
    historical = intelligence.get("historical_context", {})
    latest = (intelligence.get("recent_drilling") or [None])[0]
    return {
        "well_information": _record(well, ("well_id", "field", "latitude", "longitude", "total_depth", "well_type", "status")),
        "formations": [_record(f, ("formation_name", "lithology", "pressure", "temperature", "top_depth", "bottom_depth")) for f in intelligence.get("formations", [])],
        "similar_wells": list(intelligence.get("similar_wells", [])),
        "historical_events": [_record(e, ("event_type", "severity", "depth", "formation", "description", "cause", "mitigation", "outcome")) for e in intelligence.get("events", [])],
        "current_telemetry": _record(latest, ("timestamp", "depth", "rop", "wob", "rpm", "torque", "standpipe_pressure", "mud_density")) if latest else None,
        "xgboost_risk": intelligence.get("risk"),
        "operational_alerts": [_record(a, ("well_id", "event_type", "severity", "probability", "depth", "created_at", "status", "source", "description")) for a in (alerts or [])],
        "rag_evidence": [{"well_id": c.get("well_id"), "document": c.get("document_name"), "similarity": c.get("similarity"), "text": c.get("content")} for c in historical.get("retrieved", [])],
        "dataset_notice": "All supplied telemetry, reports, events, and alerts are synthetic demonstration data unless an evidence item explicitly says otherwise.",
    }
