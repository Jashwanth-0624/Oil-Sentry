"""Pluggable LLM provider factory for eRTMAC-NWIS."""

from __future__ import annotations

import os

from rag.generation.providers.base import (
    BaseLLMProvider,
    LLMAuthenticationError,
    LLMError,
    LLMRateLimitError,
    LLMResult,
    LLMTimeoutError,
    LLMUnavailableError,
)
from rag.generation.providers.openai_provider import OpenAIProvider
from rag.generation.providers.gemini_provider import GeminiProvider


def get_provider(
    provider_name: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> BaseLLMProvider | None:
    """Resolve and instantiate configured LLM provider from name or environment."""
    resolved_provider = (
        provider_name or os.getenv("LLM_PROVIDER") or ""
    ).strip().lower()

    if resolved_provider in {"", "none", "disabled", "null"}:
        return None

    if resolved_provider == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    if resolved_provider == "gemini":
        return GeminiProvider(api_key=api_key, model=model)

    raise ValueError(
        f"Unsupported LLM provider '{resolved_provider}'. Supported providers: 'openai', 'gemini', 'none'."
    )


__all__ = [
    "BaseLLMProvider",
    "LLMResult",
    "LLMError",
    "LLMAuthenticationError",
    "LLMRateLimitError",
    "LLMTimeoutError",
    "LLMUnavailableError",
    "OpenAIProvider",
    "GeminiProvider",
    "get_provider",
]
