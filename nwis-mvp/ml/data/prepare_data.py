"""Load drilling-log features from PostgreSQL for risk-model training."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
for path in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.core.database import engine  # noqa: E402
from ml.labels import CLASS_ORDER  # noqa: E402

FEATURE_COLUMNS = [
    "depth",
    "rop",
    "wob",
    "rpm",
    "torque",
    "standpipe_pressure",
    "mud_density",
]
TARGET_COLUMN = "event_label"
GROUP_COLUMN = "well_id"
REQUIRED_COLUMNS = FEATURE_COLUMNS + [TARGET_COLUMN, GROUP_COLUMN]


def load_drilling_logs() -> pd.DataFrame:
    if engine is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. Create backend/.env from backend/.env.example."
        )

    query = text(
        """
        SELECT
            w.well_id,
            d.depth,
            d.rop,
            d.wob,
            d.rpm,
            d.torque,
            d.standpipe_pressure,
            d.mud_density,
            d.event_label
        FROM drilling_logs AS d
        INNER JOIN wells AS w ON w.id = d.well_id
        """
    )
    with engine.connect() as connection:
        frame = pd.read_sql(query, connection)

    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(f"drilling_logs query is missing required column(s): {', '.join(missing)}")

    before = len(frame)
    frame = frame.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN, GROUP_COLUMN]).copy()
    dropped = before - len(frame)
    if dropped:
        print(f"Dropped {dropped} row(s) with null feature, target, or well_id values.")

    frame[TARGET_COLUMN] = frame[TARGET_COLUMN].astype(int)
    invalid_labels = sorted(set(frame[TARGET_COLUMN].unique()) - set(CLASS_ORDER))
    if invalid_labels:
        raise ValueError(f"Unexpected event_label values: {invalid_labels}")

    for column in FEATURE_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame = frame.dropna(subset=FEATURE_COLUMNS).copy()
    frame[GROUP_COLUMN] = frame[GROUP_COLUMN].astype(str)
    return frame.reset_index(drop=True)


def prepare_training_arrays(
    frame: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    data = load_drilling_logs() if frame is None else frame
    features = data[FEATURE_COLUMNS].copy()
    target = data[TARGET_COLUMN].copy()
    groups = data[GROUP_COLUMN].copy()
    return features, target, groups


def main() -> None:
    features, target, groups = prepare_training_arrays()
    print(f"Rows: {len(features)}")
    print(f"Wells: {groups.nunique()}")
    print("Label counts:")
    print(target.value_counts().sort_index().to_string())


if __name__ == "__main__":
    main()
