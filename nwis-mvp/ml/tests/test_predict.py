from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.inference.predict import predict_from_features, predict_values  # noqa: E402
from ml.labels import CLASS_NAMES, CLASS_ORDER, EVENT_LABEL_TO_NAME  # noqa: E402

NORMAL_SAMPLE = {
    "depth": 3200,
    "rop": 28,
    "wob": 10,
    "rpm": 120,
    "torque": 15,
    "standpipe_pressure": 2200,
    "mud_density": 1.08,
}

HIGH_ENERGY_SAMPLE = {
    "depth": 3230,
    "rop": 11,
    "wob": 16,
    "rpm": 110,
    "torque": 31,
    "standpipe_pressure": 2700,
    "mud_density": 1.12,
}


def _assert_valid_prediction(result: dict) -> None:
    assert result["predicted_class"] in CLASS_ORDER
    assert result["predicted_label"] in CLASS_NAMES
    assert result["predicted_label"] == EVENT_LABEL_TO_NAME[result["predicted_class"]]
    probabilities = result["probabilities"]
    assert set(probabilities) == set(CLASS_NAMES)
    assert all(0.0 <= value <= 1.0 for value in probabilities.values())
    assert abs(sum(probabilities.values()) - 1.0) < 1e-6
    summary = result["risk_summary"]
    assert summary["predicted_label"] == result["predicted_label"]
    assert abs(summary["risk_probability"] - probabilities[result["predicted_label"]]) < 1e-12


def test_normal_looking_sample_has_valid_inference() -> None:
    result = predict_from_features(NORMAL_SAMPLE)
    _assert_valid_prediction(result)


def test_high_torque_sample_has_valid_inference() -> None:
    result = predict_values(**HIGH_ENERGY_SAMPLE)
    _assert_valid_prediction(result)
