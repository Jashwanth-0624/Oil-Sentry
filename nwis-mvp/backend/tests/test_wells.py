"""Automated tests for Phase 7 FastAPI intelligence orchestration and well endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_wells_returns_20_wells() -> None:
	response = client.get("/api/wells")
	assert response.status_code == 200
	wells = response.json()
	assert isinstance(wells, list)
	assert len(wells) == 20
	first = wells[0]
	assert "well_id" in first
	assert "field" in first
	assert "latitude" in first
	assert "longitude" in first
	assert "total_depth" in first
	assert "well_type" in first
	assert "status" in first


def test_get_well_details_returns_nested_sections() -> None:
	response = client.get("/api/wells/W001")
	assert response.status_code == 200
	data = response.json()
	assert "well" in data
	assert data["well"]["well_id"] == "W001"
	assert "formations" in data
	assert isinstance(data["formations"], list)
	assert len(data["formations"]) > 0
	assert "recent_drilling" in data
	assert isinstance(data["recent_drilling"], list)
	assert len(data["recent_drilling"]) > 0
	assert len(data["recent_drilling"]) <= 20
	assert "events" in data
	assert isinstance(data["events"], list)


def test_get_well_unknown_returns_404() -> None:
	response = client.get("/api/wells/W999")
	assert response.status_code == 404
	assert "not found" in response.json()["detail"].lower()


def test_get_well_similar_returns_similarity_response() -> None:
	response = client.get("/api/wells/W001/similar?radius_km=15&limit=3")
	assert response.status_code == 200
	data = response.json()
	assert "current_well" in data
	assert data["current_well"]["well_id"] == "W001"
	assert "results" in data
	assert isinstance(data["results"], list)
	if data["results"]:
		first = data["results"][0]
		assert "similarity_score" in first
		assert "distance_km" in first
		assert "common_formations" in first


def test_get_well_similar_unknown_returns_404() -> None:
	response = client.get("/api/wells/W999/similar")
	assert response.status_code == 404


def test_predict_well_risk_validates_and_predicts() -> None:
	payload = {
		"depth": 3100.0,
		"rop": 18.0,
		"wob": 14.0,
		"rpm": 110.0,
		"torque": 420.0,
		"standpipe_pressure": 2100.0,
		"mud_density": 1.22,
	}
	response = client.post("/api/wells/W001/risk", json=payload)
	assert response.status_code == 200
	data = response.json()
	assert "predicted_class" in data
	assert "predicted_label" in data
	assert "probabilities" in data
	assert "risk_summary" in data
	assert data["predicted_label"] in ["NORMAL", "STUCK_PIPE", "MUD_LOSS", "HIGH_TORQUE"]


def test_predict_well_risk_unknown_returns_404() -> None:
	payload = {
		"depth": 3100.0,
		"rop": 18.0,
		"wob": 14.0,
		"rpm": 110.0,
		"torque": 420.0,
		"standpipe_pressure": 2100.0,
		"mud_density": 1.22,
	}
	response = client.post("/api/wells/W999/risk", json=payload)
	assert response.status_code == 404


def test_predict_well_risk_invalid_payload_returns_422() -> None:
	response = client.post("/api/wells/W001/risk", json={"depth": -50.0})
	assert response.status_code == 422


def test_get_well_intelligence_orchestration() -> None:
	response = client.get("/api/wells/W001/intelligence")
	assert response.status_code == 200
	data = response.json()

	# 1. Well metadata
	assert "well" in data
	assert data["well"]["well_id"] == "W001"

	# 2. Formations, drilling, events
	assert "formations" in data
	assert "recent_drilling" in data
	assert "events" in data

	# 3. Similar wells
	assert "similar_wells" in data
	assert isinstance(data["similar_wells"], list)

	# 4. Risk prediction from recent drilling parameters
	assert "risk" in data
	if data["risk"] is not None:
		assert "predicted_class" in data["risk"]
		assert "predicted_label" in data["risk"]
		assert "probabilities" in data["risk"]

	# 5. Native pgvector RAG historical context
	assert "historical_context" in data
	assert data["historical_context"] is not None
	hc = data["historical_context"]
	assert "W001" in hc["question"]
	assert hc["retrieval_backend"] == "pgvector_cosine"
	assert hc["pgvector_enabled"] is True
	assert hc["generation_status"] == "llm_not_configured"
	assert "Generation requires configured LLM provider credentials" in hc["answer"]
	assert len(hc["sources"]) > 0
	assert len(hc["retrieved"]) > 0


def test_get_well_intelligence_unknown_returns_404() -> None:
	response = client.get("/api/wells/W999/intelligence")
	assert response.status_code == 404
