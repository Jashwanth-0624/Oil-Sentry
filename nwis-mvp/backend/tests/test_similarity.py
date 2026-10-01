from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_similarity_endpoint_returns_results_for_known_well() -> None:
    response = client.get("/api/similarity/W001")
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["current_well"]["well_id"] == "W001"
    assert payload["search_radius_km"] == 10
    assert payload["results"]
    assert all(item["well_id"] != "W001" for item in payload["results"])
    assert all(0 <= item["similarity_score"] <= 100 for item in payload["results"])
    assert all(item["distance_km"] <= 10 for item in payload["results"])
    assert payload["results"] == sorted(
        payload["results"], key=lambda item: item["similarity_score"], reverse=True
    )


def test_similarity_endpoint_returns_404_for_unknown_well() -> None:
    response = client.get("/api/similarity/W999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Well W999 not found"
