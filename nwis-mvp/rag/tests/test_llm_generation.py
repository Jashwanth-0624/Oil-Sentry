"""Comprehensive unit tests for provider-agnostic grounded LLM generation layer."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from rag.generation.generator import (
    LLMGenerator,
    calculate_confidence,
    evidence_is_sufficient,
    extract_evidence_items,
    generate_answer,
    llm_is_configured,
)
from rag.generation.prompts import (
    GROUNDING_INSTRUCTIONS,
    GROUNDING_SYSTEM_INSTRUCTIONS,
    LLM_REQUIRED_MESSAGE,
    NO_EVIDENCE_ANSWER,
    build_prompt,
    format_evidence_block,
)
from rag.generation.providers import (
    BaseLLMProvider,
    LLMAuthenticationError,
    LLMError,
    LLMRateLimitError,
    LLMResult,
    LLMTimeoutError,
    LLMUnavailableError,
    OpenAIProvider,
    get_provider,
)


class DummyMockProvider(BaseLLMProvider):
    """Deterministic mock provider for automated test verification without API keys."""

    def __init__(
        self,
        mock_response: str = "Mocked grounded response referencing W005.",
        should_fail_with: Exception | None = None,
        available: bool = True,
    ) -> None:
        self.mock_response = mock_response
        self.should_fail_with = should_fail_with
        self._available = available
        self.call_count = 0

    @property
    def provider_name(self) -> str:
        return "mock_provider"

    @property
    def model_name(self) -> str:
        return "mock-model"

    def is_available(self) -> bool:
        return self._available

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> LLMResult:
        self.call_count += 1
        if self.should_fail_with:
            raise self.should_fail_with
        return LLMResult(
            content=self.mock_response,
            provider=self.provider_name,
            model=self.model_name,
            finish_reason="stop",
            raw_response={"usage": {"total_tokens": 42}},
        )


def test_base_provider_interface() -> None:
    provider = DummyMockProvider(mock_response="Test content")
    assert provider.provider_name == "mock_provider"
    assert provider.model_name == "mock-model"
    assert provider.is_available() is True
    res = provider.generate("hello")
    assert res.content == "Test content"
    assert res.provider == "mock_provider"
    assert res.model == "mock-model"
    assert res.finish_reason == "stop"


def test_provider_factory_and_openai_provider() -> None:
    provider = get_provider(provider_name="openai", api_key="sk-unit-test", model="gpt-4o-mini")
    assert isinstance(provider, OpenAIProvider)
    assert provider.provider_name == "openai"
    assert provider.model_name == "gpt-4o-mini"
    assert provider.is_available() is True

    # Empty or disabled provider
    none_provider = get_provider(provider_name="none")
    assert none_provider is None

    with pytest.raises(ValueError, match="Unsupported LLM provider"):
        get_provider(provider_name="unsupported_vendor")


def test_prompt_construction_and_evidence_formatting() -> None:
    chunks = [
        {
            "well_id": "W005",
            "document_name": "W005_drilling_report.pdf",
            "page_number": 2,
            "chunk_index": 3,
            "similarity": 0.884,
            "content": "Stuck pipe observed at 3270m in Barail formation.",
        },
        {
            "well_id": "W002",
            "document_name": "W002_completion_log.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "similarity": 0.742,
            "content": "Mud loss mitigated with bridging agent.",
        },
    ]
    formatted = format_evidence_block(chunks)
    assert "[Source 1]" in formatted
    assert "Well ID: W005" in formatted
    assert "0.884" in formatted
    assert "[Source 2]" in formatted
    assert "Well ID: W002" in formatted

    well_context = {
        "well_id": "W001",
        "field": "Nahorkatiya",
        "total_depth": 3600.0,
        "status": "DRILLING",
    }
    prompt = build_prompt(
        question="What problems occurred at 3200m?",
        chunks=chunks,
        well_context=well_context,
    )
    assert "Target Well ID: W001" in prompt
    assert "Nahorkatiya" in prompt
    assert "Total Depth: 3600.0m" in prompt
    assert "Do not invent" in prompt
    assert "W005_drilling_report.pdf" in prompt


def test_confidence_calculation() -> None:
    assert calculate_confidence([]) == "low"
    assert calculate_confidence([{"similarity": 0.20}]) == "low"
    # Single high similarity chunk (< 2 chunks)
    assert calculate_confidence([{"similarity": 0.75}]) == "medium"
    # Multiple chunks with high similarity
    assert calculate_confidence([{"similarity": 0.85}, {"similarity": 0.72}]) == "high"
    # Multiple chunks with medium similarity
    assert calculate_confidence([{"similarity": 0.45}, {"similarity": 0.50}, {"similarity": 0.35}]) == "medium"


def test_extract_evidence_items() -> None:
    chunks = [
        {"well_id": "W005", "document_name": "rep.pdf", "chunk_index": 1, "similarity": 0.8523},
        {"well_id": "W005", "document_name": "rep.pdf", "chunk_index": 1, "similarity": 0.8523},  # duplicate
        {"well_id": "W002", "document_name": "rep2.pdf", "chunk_index": 0, "similarity": 0.65},
    ]
    items = extract_evidence_items(chunks)
    assert len(items) == 2
    assert items[0]["well_id"] == "W005"
    assert items[0]["relevance"] == 0.852
    assert items[1]["well_id"] == "W002"


def test_generator_with_missing_credentials() -> None:
    generator = LLMGenerator(provider=None)
    chunks = [{"well_id": "W005", "content": "Evidence text", "similarity": 0.8}]
    result = generator.generate("What happened?", chunks)
    assert result["generation_status"] == "llm_not_configured"
    assert result["called_llm"] is False
    assert result["answer"] == LLM_REQUIRED_MESSAGE
    assert result["llm"]["configured"] is False
    assert result["llm"]["status"] == "not_configured"
    assert len(result["evidence"]) == 1
    assert result["grounded"] is True


def test_generator_successful_mocked_generation() -> None:
    mock_prov = DummyMockProvider(mock_response="Grounded finding: W005 recorded stuck pipe at 3270m.")
    generator = LLMGenerator(provider=mock_prov)
    chunks = [
        {"well_id": "W005", "document_name": "doc1.pdf", "chunk_index": 0, "similarity": 0.85, "content": "Stuck pipe at 3270m."},
        {"well_id": "W005", "document_name": "doc2.pdf", "chunk_index": 1, "similarity": 0.75, "content": "Mitigation applied."},
    ]
    result = generator.generate("What happened in W005?", chunks)
    assert result["generation_status"] == "ok"
    assert result["called_llm"] is True
    assert "W005 recorded stuck pipe" in result["answer"]
    assert result["confidence"] == "high"
    assert result["llm"]["configured"] is True
    assert result["llm"]["provider"] == "mock_provider"
    assert result["llm"]["status"] == "success"
    assert result["grounded"] is True
    assert len(result["evidence"]) == 2
    assert mock_prov.call_count == 1


def test_generator_handles_auth_error_gracefully() -> None:
    failing_prov = DummyMockProvider(should_fail_with=LLMAuthenticationError("Invalid API key"))
    generator = LLMGenerator(provider=failing_prov)
    chunks = [{"well_id": "W005", "similarity": 0.8, "content": "Stuck pipe"}]
    result = generator.generate("What happened?", chunks)
    assert result["generation_status"] == "authentication_error"
    assert result["called_llm"] is False
    assert "authentication failed" in result["answer"]
    assert result["llm"]["status"] == "auth_error"
    assert len(result["evidence"]) == 1


def test_generator_handles_rate_limit_and_timeout() -> None:
    timeout_prov = DummyMockProvider(should_fail_with=LLMTimeoutError("Request timed out"))
    generator = LLMGenerator(provider=timeout_prov)
    chunks = [{"well_id": "W005", "similarity": 0.8, "content": "Stuck pipe"}]
    result = generator.generate("What happened?", chunks)
    assert result["generation_status"] == "provider_error"
    assert result["called_llm"] is False
    assert "temporarily unavailable" in result["answer"]
    assert result["llm"]["status"] == "provider_error"
    assert len(result["evidence"]) == 1


def test_generator_empty_retrieval_returns_no_evidence() -> None:
    mock_prov = DummyMockProvider()
    generator = LLMGenerator(provider=mock_prov)
    result = generator.generate("What happened on Mars?", [])
    assert result["generation_status"] == "no_evidence"
    assert result["called_llm"] is False
    assert result["answer"] == NO_EVIDENCE_ANSWER
    assert mock_prov.call_count == 0
    assert result["confidence"] == "low"
