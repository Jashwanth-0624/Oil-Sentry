"""Load the trained drilling-risk model and run inference."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

import joblib
import pandas as pd

from ml.data.prepare_data import FEATURE_COLUMNS
from ml.labels import CLASS_ORDER, EVENT_LABEL_TO_NAME, label_name, probabilities_by_name

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.joblib"


class ModelNotTrainedError(FileNotFoundError):
    """Raised when the saved risk model is missing."""


def default_model_path() -> Path:
    return MODEL_PATH


@lru_cache(maxsize=1)
def load_risk_model(model_path: str | Path | None = None) -> dict[str, Any]:
    path = Path(model_path) if model_path is not None else default_model_path()
    if not path.exists():
        raise ModelNotTrainedError(
            f"Risk model not found at {path}. Train it first with "
            "python -m ml.training.train_risk_model"
        )
    artifact = joblib.load(path)
    required = {"model", "feature_names", "classes"}
    missing = required - set(artifact)
    if missing:
        raise ValueError(f"Risk model artifact is missing: {', '.join(sorted(missing))}")
    return artifact


def clear_loaded_model() -> None:
    load_risk_model.cache_clear()


def _feature_frame(features: Mapping[str, float], feature_names: list[str]) -> pd.DataFrame:
    missing = [name for name in feature_names if name not in features]
    if missing:
        raise ValueError(f"Missing feature(s): {', '.join(missing)}")
    row = {name: float(features[name]) for name in feature_names}
    return pd.DataFrame([row], columns=feature_names)


def predict_from_features(
    features: Mapping[str, float],
    model_path: str | Path | None = None,
) -> dict[str, Any]:
    artifact = load_risk_model(str(model_path) if model_path is not None else None)
    model = artifact["model"]
    feature_names = list(artifact["feature_names"])
    frame = _feature_frame(features, feature_names)
    predicted_class = int(model.predict(frame)[0])
    raw_probabilities = model.predict_proba(frame)[0]
    class_ids = [int(item) for item in model.classes_]
    probability_map = {class_id: 0.0 for class_id in CLASS_ORDER}
    for class_id, probability in zip(class_ids, raw_probabilities, strict=True):
        probability_map[int(class_id)] = float(probability)

    predicted_label = label_name(predicted_class)
    named_probabilities = probabilities_by_name(probability_map)
    risk_probability = float(named_probabilities[predicted_label])
    return {
        "predicted_class": predicted_class,
        "predicted_label": predicted_label,
        "probabilities": named_probabilities,
        "risk_summary": {
            "predicted_label": predicted_label,
            "risk_probability": risk_probability,
        },
    }


def predict_values(
    depth: float,
    rop: float,
    wob: float,
    rpm: float,
    torque: float,
    standpipe_pressure: float,
    mud_density: float,
    model_path: str | Path | None = None,
) -> dict[str, Any]:
    features = {
        "depth": depth,
        "rop": rop,
        "wob": wob,
        "rpm": rpm,
        "torque": torque,
        "standpipe_pressure": standpipe_pressure,
        "mud_density": mud_density,
    }
    extra = set(FEATURE_COLUMNS) - set(features)
    if extra:
        raise ValueError(f"FEATURE_COLUMNS mismatch: {sorted(extra)}")
    return predict_from_features(features, model_path=model_path)


def main() -> None:
    samples = [
        {
            "name": "normal-looking",
            "features": {
                "depth": 3200,
                "rop": 28,
                "wob": 10,
                "rpm": 120,
                "torque": 15,
                "standpipe_pressure": 2200,
                "mud_density": 1.08,
            },
        },
        {
            "name": "high-torque/stuck-pipe-like",
            "features": {
                "depth": 3230,
                "rop": 11,
                "wob": 16,
                "rpm": 110,
                "torque": 31,
                "standpipe_pressure": 2700,
                "mud_density": 1.12,
            },
        },
    ]
    for sample in samples:
        result = predict_from_features(sample["features"])
        print(f"{sample['name']}: {result}")
        print(f"class names available: {list(EVENT_LABEL_TO_NAME.values())}")


if __name__ == "__main__":
    main()
