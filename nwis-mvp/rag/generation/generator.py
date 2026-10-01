"""Grounded historical drilling intelligence generator using pluggable LLM providers."""

from __future__ import annotations

import logging
import os
import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from rag.generation.prompts import (
    GROUNDING_INSTRUCTIONS,
    GROUNDING_SYSTEM_INSTRUCTIONS,
    LLM_REQUIRED_MESSAGE,
    NO_EVIDENCE_ANSWER,
    build_prompt,
    build_grounded_generation_prompt,
)
from rag.generation.providers import (
    BaseLLMProvider,
    LLMAuthenticationError,
    LLMError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
    OpenAIProvider,
    get_provider,
)

logger = logging.getLogger(__name__)


class GroundedRiskContext(BaseModel):
    predicted_event: str | None = None
    probability: float | None = None
    source: str = "XGBOOST"


class GroundedEvidence(BaseModel):
    source: str
    similarity: float | None = None
    well_id: str | None = None


class GroundedGenerationResponse(BaseModel):
    answer: str = Field(min_length=1, max_length=6000)
    key_findings: list[str] = Field(default_factory=list, max_length=10)
    risk_context: GroundedRiskContext = Field(default_factory=GroundedRiskContext)
    evidence: list[GroundedEvidence] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list, max_length=10)


def evidence_is_sufficient(chunks: list[dict[str, Any]]) -> bool:
    """Return True if at least one evidence chunk was retrieved."""
    return bool(chunks)


def llm_is_configured(
    provider: str | None = None,
    api_key: str | None = None,
) -> bool:
    """Check if configured provider has required credentials."""
    resolved_provider = (
        provider or os.getenv("LLM_PROVIDER") or ""
    ).strip().lower()

    if resolved_provider in {"", "none", "disabled"}:
        return False

    if resolved_provider == "openai":
        key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")
        return bool(key and key.strip())
    if resolved_provider == "gemini":
        key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY")
        return bool(key and key.strip())

    return False


def calculate_confidence(chunks: list[dict[str, Any]]) -> str:
    """Deterministic confidence score based on retrieval similarity and quantity."""
    if not chunks:
        return "low"

    similarities = [
        float(c.get("similarity", 0.0))
        for c in chunks
        if c.get("similarity") is not None
    ]
    if not similarities:
        return "low"

    max_sim = max(similarities)
    count = len(similarities)

    if max_sim >= 0.70 and count >= 2:
        return "high"
    if max_sim >= 0.40 or count >= 3:
        return "medium"
    return "low"


def extract_evidence_items(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extract structured evidence references from retrieved chunks."""
    items: list[dict[str, Any]] = []
    seen: set[tuple] = set()

    for c in chunks:
        key = (c.get("well_id"), c.get("document_name") or c.get("document"), c.get("chunk_index"))
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "well_id": c.get("well_id"),
                "source": c.get("document_name") or c.get("document") or "Operational Report",
                "relevance": round(float(c.get("similarity", 0.0)), 3) if c.get("similarity") is not None else None,
            }
        )
    return items


class LLMGenerator:
    """Grounded drilling intelligence generator."""

    def __init__(
        self,
        provider: BaseLLMProvider | None = None,
    ) -> None:
        self.provider = provider

    @classmethod
    def from_environment(
        cls,
        provider_name: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> LLMGenerator:
        """Create generator by inspecting environment or passed overrides."""
        try:
            prov = get_provider(provider_name=provider_name, api_key=api_key, model=model)
            return cls(provider=prov)
        except ValueError as err:
            logger.warning("Unrecognized provider in environment: %s", err)
            return cls(provider=None)

    def generate(
        self,
        question: str,
        chunks: list[dict[str, Any]],
        well_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute grounded generation over retrieved chunks."""
        confidence = calculate_confidence(chunks)
        evidence_items = extract_evidence_items(chunks)
        limitations = [
            "Grounded exclusively in retrieved historical report chunks.",
            "Synthetic benchmark dataset (not real Oil India SCADA/telemetry).",
        ]

        # Case 1: No evidence retrieved
        if not evidence_is_sufficient(chunks):
            return {
                "answer": NO_EVIDENCE_ANSWER,
                "generation_status": "no_evidence",
                "evidence": [],
                "confidence": "low",
                "limitations": ["No historical records met the minimum relevance threshold."],
                "grounded": True,
                "called_llm": False,
                "prompt": None,
                "llm": {
                    "configured": False,
                    "provider": None,
                    "model": None,
                    "status": "no_evidence",
                },
            }

        prompt = build_prompt(question, chunks, well_context=well_context)

        # Case 2: Provider not configured or missing credentials
        if self.provider is None or not self.provider.is_available():
            return {
                "answer": LLM_REQUIRED_MESSAGE,
                "generation_status": "llm_not_configured",
                "evidence": evidence_items,
                "confidence": confidence,
                "limitations": limitations + ["LLM provider credentials are not configured."],
                "grounded": True,
                "called_llm": False,
                "prompt": prompt,
                "llm": {
                    "configured": False,
                    "provider": self.provider.provider_name if self.provider else None,
                    "model": self.provider.model_name if self.provider else None,
                    "status": "not_configured",
                },
            }

        # Case 3: Call configured provider
        try:
            result = self.provider.generate(
                prompt=prompt,
                system_prompt=GROUNDING_SYSTEM_INSTRUCTIONS,
                temperature=0.0,
            )
            content = result.content or NO_EVIDENCE_ANSWER
            return {
                "answer": content,
                "generation_status": "ok",
                "evidence": evidence_items,
                "confidence": confidence,
                "limitations": limitations,
                "grounded": True,
                "called_llm": True,
                "prompt": prompt,
                "llm": {
                    "configured": True,
                    "provider": result.provider,
                    "model": result.model,
                    "status": "success",
                },
            }

        except LLMAuthenticationError as exc:
            logger.error("LLM authentication failed: %s", exc)
            return {
                "answer": "LLM provider authentication failed. Check configured API key credentials.",
                "generation_status": "authentication_error",
                "evidence": evidence_items,
                "confidence": confidence,
                "limitations": limitations + ["Provider authentication failure."],
                "grounded": True,
                "called_llm": False,
                "prompt": prompt,
                "llm": {
                    "configured": True,
                    "provider": self.provider.provider_name,
                    "model": self.provider.model_name,
                    "status": "auth_error",
                },
            }

        except (LLMRateLimitError, LLMTimeoutError, LLMUnavailableError) as exc:
            logger.error("LLM service issue: %s", exc)
            return {
                "answer": f"LLM generation temporarily unavailable ({type(exc).__name__}). Grounded historical sources remain intact below.",
                "generation_status": "provider_error",
                "evidence": evidence_items,
                "confidence": confidence,
                "limitations": limitations + [f"Service issue: {type(exc).__name__}"],
                "grounded": True,
                "called_llm": False,
                "prompt": prompt,
                "llm": {
                    "configured": True,
                    "provider": self.provider.provider_name,
                    "model": self.provider.model_name,
                    "status": "provider_error",
                },
            }

        except Exception as exc:
            logger.error("Unexpected LLM failure: %s", exc)
            return {
                "answer": "An unexpected error occurred during LLM synthesis. Retrieved historical evidence is provided below.",
                "generation_status": "generation_failed",
                "evidence": evidence_items,
                "confidence": confidence,
                "limitations": limitations + ["Unexpected generation exception"],
                "grounded": True,
                "called_llm": False,
                "prompt": prompt,
                "llm": {
                    "configured": True,
                    "provider": self.provider.provider_name,
                    "model": self.provider.model_name,
                    "status": "error",
                },
            }


def generate_answer(
    question: str,
    chunks: list[dict[str, Any]],
    provider: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    well_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Convenience functional interface for generating grounded answers."""
    gen = LLMGenerator.from_environment(
        provider_name=provider,
        api_key=api_key,
        model=model,
    )
    return gen.generate(question, chunks, well_context=well_context)


def _context_evidence(context: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {"source": item.get("document") or "Operational Report", "similarity": item.get("similarity"), "well_id": item.get("well_id")}
        for item in context.get("rag_evidence", [])
    ]


def _risk_context(context: dict[str, Any]) -> dict[str, Any]:
    risk = context.get("xgboost_risk") or {}
    return {
        "predicted_event": risk.get("label") or risk.get("predicted_label") or risk.get("predicted_event"),
        "probability": risk.get("probability"),
        "source": "XGBOOST",
    }


def generate_grounded_response(question: str, context: dict[str, Any], provider: BaseLLMProvider | None = None) -> dict[str, Any]:
    """Generate a validated Gemini-style structured answer from already retrieved context.

    This function deliberately accepts context rather than a database session so the LLM
    layer cannot execute arbitrary database work.
    """
    if not isinstance(context, dict):
        return {"generation_status": "invalid_context", "answer": None, "key_findings": [], "risk_context": {}, "evidence": [], "limitations": ["Verified generation context is invalid."], "grounded": True}
    if not question or not question.strip():
        return {"generation_status": "invalid_question", "answer": None, "key_findings": [], "risk_context": _risk_context(context), "evidence": _context_evidence(context), "limitations": ["A non-empty question is required."], "grounded": True}
    evidence = _context_evidence(context)
    if not evidence:
        return {"generation_status": "no_evidence", "answer": None, "key_findings": [], "risk_context": _risk_context(context), "evidence": [], "limitations": ["No RAG evidence was available for grounded generation."], "grounded": True}
    selected = provider or LLMGenerator.from_environment().provider
    if selected is None or not selected.is_available():
        return {"generation_status": "llm_not_configured", "answer": None, "key_findings": [], "risk_context": _risk_context(context), "evidence": evidence, "limitations": ["Gemini generation is not configured; retrieved evidence remains available."], "grounded": True, "llm": {"provider": selected.provider_name if selected else None, "model": selected.model_name if selected else None, "status": "not_configured"}}
    try:
        result = selected.generate(prompt=build_grounded_generation_prompt(question, context), system_prompt=GROUNDING_SYSTEM_INSTRUCTIONS, temperature=0.0, max_tokens=900, response_mime_type="application/json", response_schema=GroundedGenerationResponse)
        parsed = GroundedGenerationResponse.model_validate(json.loads(result.content))
        output = parsed.model_dump()
        # Sources and risk context are backend-owned metadata, never model-owned facts.
        output["evidence"] = evidence
        output["risk_context"] = _risk_context(context)
        output.update({"generation_status": "ok", "grounded": True, "llm": {"provider": result.provider, "model": result.model, "status": "success"}})
        return output
    except (json.JSONDecodeError, ValidationError):
        return {"generation_status": "invalid_model_response", "answer": None, "key_findings": [], "risk_context": _risk_context(context), "evidence": evidence, "limitations": ["Gemini returned an invalid structured response; retrieved evidence remains available."], "grounded": True}
    except (LLMAuthenticationError, LLMRateLimitError, LLMTimeoutError, LLMUnavailableError, LLMError):
        return {"generation_status": "llm_unavailable", "answer": None, "key_findings": [], "risk_context": _risk_context(context), "evidence": evidence, "limitations": ["Gemini generation is currently unavailable; retrieved evidence remains available."], "grounded": True}
