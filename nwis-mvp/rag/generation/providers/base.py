"""Abstract base interface for pluggable LLM providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class LLMError(Exception):
    """Base exception for LLM provider errors."""
    pass


class LLMAuthenticationError(LLMError):
    """Raised when provider API key or credentials are invalid."""
    pass


class LLMRateLimitError(LLMError):
    """Raised when rate limits or quota are exceeded."""
    pass


class LLMTimeoutError(LLMError):
    """Raised when LLM request times out."""
    pass


class LLMUnavailableError(LLMError):
    """Raised when provider service is unreachable."""
    pass


@dataclass
class LLMResult:
    """Structured response from an LLM provider."""
    content: str
    model: str
    provider: str
    usage: dict[str, int] = field(default_factory=dict)
    finish_reason: str | None = None
    raw_response: Any = None



class BaseLLMProvider(ABC):
    """Abstract interface for LLM provider implementations."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name identifier of the provider (e.g., 'openai')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Configured model name (e.g., 'gpt-4o-mini')."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if credentials and configuration are valid."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Generate response given a user prompt and optional system prompt."""
        pass
