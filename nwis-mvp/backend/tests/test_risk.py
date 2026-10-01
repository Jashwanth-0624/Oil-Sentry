from fastapi.testclient import TestClient

from app.main import app
from app.schemas.risk import RiskPredictResponse

client = TestClient(app)

NORMAL_PAYLOAD = {
    "depth": 3200,
    "rop": 28,
    "wob": 10,
    "rpm": 120,
    "torque": 15,
    "standpipe_pressure": 2200,
    "mud_density": 1.08,
}

HIGH_ENERGY_PAYLOAD = {
    "depth": 3230,
    "rop": 11,
    "wob": 16,
    "rpm": 110,
    "torque": 31,
    "standpipe_pressure": 2700,
    "mud_density": 1.12,
}


def _assert_risk_response(payload: dict) -> None:
    parsed = RiskPredictResponse.model_validate(payload)
    assert parsed.predicted_class in {0, 1, 2, 3}
    assert parsed.predicted_label in {"NORMAL", "STUCK_PIPE", "MUD_LOSS", "HIGH_TORQUE"}
    probabilities = payload["probabilities"]
    assert set(probabilities) == {"NORMAL", "STUCK_PIPE", "MUD_LOSS", "HIGH_TORQUE"}
    assert all(0.0 <= value <= 1.0 for value in probabilities.values())
    assert abs(sum(probabilities.values()) - 1.0) < 1e-5
    assert payload["risk_summary"]["predicted_label"] == payload["predicted_label"]
    assert abs(
        payload["risk_summary"]["risk_probability"] - probabilities[payload["predicted_label"]]
    ) < 1e-12


def test_risk_predict_normal_looking_sample() -> None:
    response = client.post("/api/risk/predict", json=NORMAL_PAYLOAD)
    assert response.status_code == 200, response.text
    _assert_risk_response(response.json())


def test_risk_predict_high_energy_sample() -> None:
    response = client.post("/api/risk/predict", json=HIGH_ENERGY_PAYLOAD)
    assert response.status_code == 200, response.text
    _assert_risk_response(response.json())


def test_risk_predict_rejects_non_positive_measurements() -> None:
    payload = dict(NORMAL_PAYLOAD)
    payload["torque"] = 0
    response = client.post("/api/risk/predict", json=payload)
    assert response.status_code == 422
