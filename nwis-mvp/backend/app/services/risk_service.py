"""Load the trained risk model once and run inference."""

from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.inference.predict import (  # noqa: E402
    ModelNotTrainedError,
    load_risk_model,
    predict_from_features,
)
from ml.labels import CLASS_ORDER  # noqa: E402


@lru_cache(maxsize=1)
def get_loaded_model() -> dict[str, Any]:
    try:
        return load_risk_model()
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def predict_drilling_risk(features: dict[str, float]) -> dict[str, Any]:
    get_loaded_model()
    try:
        result = predict_from_features(features)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    predicted_class = result["predicted_class"]
    if predicted_class not in CLASS_ORDER:
        raise HTTPException(status_code=500, detail="Model returned an unknown class")
    return result
