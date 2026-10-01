from fastapi.testclient import TestClient

from app.main import app
from app.schemas.rag import RagQueryRequest, RagQueryResponse

client = TestClient(app)


def test_rag_request_schema_requires_question() -> None:
    parsed = RagQueryRequest.model_validate({"question": "What problems occurred in W005?", "top_k": 5})
    assert parsed.top_k == 5


def test_rag_query_endpoint_schema() -> None:
    response = client.post(
        "/api/rag/query",
        json={"question": "What problems occurred in W005?", "top_k": 5},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    parsed = RagQueryResponse.model_validate(payload)
    assert parsed.question.startswith("What problems")
    assert "answer" in payload
    assert isinstance(payload["sources"], list)
    assert "DATABASE_URL" not in response.text
    assert "OPENAI_API_KEY" not in response.text
    for source in payload["sources"]:
        assert "document" in source
        if source.get("well_id"):
            assert source["well_id"].startswith("W")


def test_rag_no_evidence_behavior() -> None:
    response = client.post(
        "/api/rag/query",
        json={"question": "What is the chocolate cake recipe used on well ZX-999?"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    if not payload["retrieved"]:
        assert payload["sources"] == []
        assert "do not provide enough evidence" in payload["answer"].lower() or payload[
            "generation_status"
        ] in {"no_evidence", "llm_not_configured"}


def test_rag_query_phase9_schema_and_unconfigured_state() -> None:
    response = client.post(
        "/api/rag/query",
        json={"question": "What problems occurred in W005?", "top_k": 5},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    parsed = RagQueryResponse.model_validate(payload)
    assert parsed.grounded is True
    assert "llm" in payload
    assert "evidence" in payload
    assert "confidence" in payload
    assert "limitations" in payload
    if payload["generation_status"] == "llm_not_configured":
        assert payload["llm"]["configured"] is False
        assert payload["llm"]["status"] == "not_configured"
        assert len(payload["evidence"]) > 0


def test_rag_query_mocked_llm_generation(monkeypatch) -> None:
    from rag.generation.generator import LLMGenerator
    from rag.generation.providers.base import LLMResult

    class FakeProvider:
        provider_name = "mock_openai"
        model_name = "gpt-4o-mini"
        def is_available(self) -> bool:
            return True
        def generate(self, prompt: str, **kwargs) -> LLMResult:
            return LLMResult(
                content="Historical records for W005 report a stuck-pipe event at 3270m. Recorded mitigation was adjusting WOB and circulating.",
                provider="mock_openai",
                model="gpt-4o-mini",
            )

    monkeypatch.setattr(
        LLMGenerator,
        "from_environment",
        classmethod(lambda cls, **kw: LLMGenerator(provider=FakeProvider())),
    )

    response = client.post(
        "/api/rag/query",
        json={"question": "What problems occurred in W005?", "top_k": 3},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["generation_status"] == "ok"
    assert "W005 report a stuck-pipe event" in payload["answer"]
    assert payload["llm"]["configured"] is True
    assert payload["llm"]["provider"] == "mock_openai"
    assert payload["llm"]["status"] == "success"
    assert payload["grounded"] is True
    assert len(payload["evidence"]) > 0
    assert payload["metadata"]["called_llm"] is True

