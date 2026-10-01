from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from geoalchemy2 import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.models import DrillingLog, Event, Formation, Well  # noqa: E402

RAW_DIR = PROJECT_ROOT / "data" / "raw"
VALID_EVENT_LABELS = {0, 1, 2, 3}


def load_csv_files() -> dict[str, pd.DataFrame]:
    paths = {
        "wells": RAW_DIR / "wells.csv",
        "formations": RAW_DIR / "formations.csv",
        "drilling_logs": RAW_DIR / "drilling_logs.csv",
        "events": RAW_DIR / "events.csv",
    }
    missing = [str(path) for path in paths.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing CSV file(s): {', '.join(missing)}")

    frames = {name: pd.read_csv(path) for name, path in paths.items()}
    print(f"Wells CSV: {len(frames['wells'])} rows")
    print(f"Formations CSV: {len(frames['formations'])} rows")
    print(f"Drilling Logs CSV: {len(frames['drilling_logs'])} rows")
    print(f"Events CSV: {len(frames['events'])} rows")
    return frames


def require_columns(frame: pd.DataFrame, expected: set[str], name: str) -> None:
    missing = expected - set(frame.columns)
    if missing:
        raise ValueError(f"{name}.csv is missing required column(s): {', '.join(sorted(missing))}")


def value(row: pd.Series, column: str) -> Any:
    item = row[column]
    return None if pd.isna(item) else item


def clear_existing_data(session: Session) -> None:
    print("Clearing existing NWIS synthetic data...")
    session.execute(
        text(
            "TRUNCATE TABLE drilling_logs, events, formations, wells "
            "RESTART IDENTITY CASCADE"
        )
    )


def load_wells(session: Session, frame: pd.DataFrame) -> dict[str, int]:
    require_columns(
        frame,
        {"well_id", "field", "latitude", "longitude", "total_depth", "well_type", "status"},
        "wells",
    )
    wells_by_csv_id: dict[str, int] = {}
    objects: list[Well] = []

    for row in frame.to_dict("records"):
        csv_well_id = str(row["well_id"])
        if csv_well_id in wells_by_csv_id:
            raise ValueError(f"Duplicate well_id in wells.csv: {csv_well_id}")
        latitude = float(row["latitude"])
        longitude = float(row["longitude"])
        well = Well(
            well_id=csv_well_id,
            field=value(pd.Series(row), "field"),
            latitude=latitude,
            longitude=longitude,
            total_depth=float(row["total_depth"]),
            well_type=value(pd.Series(row), "well_type"),
            status=value(pd.Series(row), "status"),
            location=WKTElement(f"POINT({longitude} {latitude})", srid=4326),
        )
        objects.append(well)
        session.add(well)

    session.flush()
    for well in objects:
        wells_by_csv_id[well.well_id] = well.id

    print(f"Loaded {len(objects)} wells.")
    return wells_by_csv_id


def database_well_id(mapping: dict[str, int], csv_well_id: str, dataset: str) -> int:
    try:
        return mapping[csv_well_id]
    except KeyError as error:
        raise ValueError(f"{dataset}.csv references unknown well_id: {csv_well_id}") from error


def load_formations(session: Session, frame: pd.DataFrame, well_ids: dict[str, int]) -> None:
    require_columns(
        frame,
        {"well_id", "formation_name", "top_depth", "bottom_depth", "lithology", "pressure", "temperature"},
        "formations",
    )
    for row in frame.to_dict("records"):
        csv_well_id = str(row["well_id"])
        session.add(
            Formation(
                well_id=database_well_id(well_ids, csv_well_id, "formations"),
                formation_name=str(row["formation_name"]),
                top_depth=float(row["top_depth"]),
                bottom_depth=float(row["bottom_depth"]),
                lithology=value(pd.Series(row), "lithology"),
                pressure=float(row["pressure"]),
                temperature=float(row["temperature"]),
            )
        )
    session.flush()
    print(f"Loaded {len(frame)} formations.")


def load_drilling_logs(session: Session, frame: pd.DataFrame, well_ids: dict[str, int]) -> None:
    require_columns(
        frame,
        {"well_id", "timestamp", "depth", "rop", "wob", "rpm", "torque", "standpipe_pressure", "mud_density", "event_label"},
        "drilling_logs",
    )
    for row in frame.to_dict("records"):
        csv_well_id = str(row["well_id"])
        event_label = int(row["event_label"])
        if event_label not in VALID_EVENT_LABELS:
            raise ValueError(
                f"Invalid event_label in drilling_logs.csv: {event_label}. "
                "Expected one of 0, 1, 2, 3."
            )
        timestamp = pd.to_datetime(row["timestamp"], errors="raise").to_pydatetime()
        session.add(
            DrillingLog(
                well_id=database_well_id(well_ids, csv_well_id, "drilling_logs"),
                timestamp=timestamp,
                depth=float(row["depth"]),
                rop=float(row["rop"]),
                wob=float(row["wob"]),
                rpm=float(row["rpm"]),
                torque=float(row["torque"]),
                standpipe_pressure=float(row["standpipe_pressure"]),
                mud_density=float(row["mud_density"]),
                event_label=event_label,
            )
        )
    session.flush()
    print(f"Loaded {len(frame)} drilling logs.")


def load_events(session: Session, frame: pd.DataFrame, well_ids: dict[str, int]) -> None:
    required = {
        "well_id", "depth", "formation", "event_type", "severity", "description",
        "cause", "mitigation", "outcome",
    }
    require_columns(frame, required, "events")
    for row in frame.to_dict("records"):
        csv_well_id = str(row["well_id"])
        session.add(
            Event(
                well_id=database_well_id(well_ids, csv_well_id, "events"),
                depth=float(row["depth"]),
                formation=value(pd.Series(row), "formation"),
                event_type=str(row["event_type"]),
                severity=str(row["severity"]),
                description=value(pd.Series(row), "description"),
                cause=value(pd.Series(row), "cause"),
                mitigation=value(pd.Series(row), "mitigation"),
                outcome=value(pd.Series(row), "outcome"),
            )
        )
    session.flush()
    print(f"Loaded {len(frame)} events.")


def validate_counts(session: Session, frames: dict[str, pd.DataFrame]) -> None:
    counts = {
        "Wells": session.scalar(select(func.count()).select_from(Well)),
        "Formations": session.scalar(select(func.count()).select_from(Formation)),
        "Drilling Logs": session.scalar(select(func.count()).select_from(DrillingLog)),
        "Events": session.scalar(select(func.count()).select_from(Event)),
    }
    expected = {
        "Wells": len(frames["wells"]),
        "Formations": len(frames["formations"]),
        "Drilling Logs": len(frames["drilling_logs"]),
        "Events": len(frames["events"]),
    }
    print("Validating database...")
    for name, count in counts.items():
        print(f"{name}: {count}")
        if count != expected[name]:
            raise ValueError(f"{name} count mismatch: expected {expected[name]}, found {count}")

    locations = session.scalar(
        text("SELECT COUNT(*) FROM wells WHERE location IS NOT NULL")
    )
    print(f"Wells with PostGIS locations: {locations}")
    if locations != expected["Wells"]:
        raise ValueError(
            f"PostGIS location count mismatch: expected {expected['Wells']}, found {locations}"
        )

    wrong_srid = session.scalar(
        text("SELECT COUNT(*) FROM wells WHERE location IS NOT NULL AND ST_SRID(location) <> 4326")
    )
    if wrong_srid:
        raise ValueError(f"Found {wrong_srid} well location(s) with an SRID other than 4326")
    print("Database validation successful.")


def main() -> None:
    print("NWIS Synthetic Dataset Loader")
    print("--------------------------------")
    print("Reading CSV files...")
    frames = load_csv_files()
    session = SessionLocal()
    try:
        with session.begin():
            clear_existing_data(session)
            print("Loading wells...")
            well_ids = load_wells(session, frames["wells"])
            print("Loading formations...")
            load_formations(session, frames["formations"], well_ids)
            print("Loading drilling logs...")
            load_drilling_logs(session, frames["drilling_logs"], well_ids)
            print("Loading events...")
            load_events(session, frames["events"], well_ids)
            validate_counts(session, frames)
        print("Committing transaction...")
        print("NWIS synthetic dataset loaded successfully.")
    except Exception as error:
        session.rollback()
        print(f"Loading failed: {error}")
        print("Transaction rolled back.")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
