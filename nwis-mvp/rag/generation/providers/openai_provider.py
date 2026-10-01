"""OpenAI provider implementation for grounded subsurface generation."""

from __future__ import annotations

import os
from typing import Any

from rag.generation.providers.base import (
    BaseLLMProvider,
    LLMAuthenticationError,
    LLMError,
    LLMRateLimitError,
    LLMResult,
    LLMTimeoutError,
    LLMUnavailableError,
)

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_TIMEOUT_SECONDS = 25.0


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider for RAG answer synthesis."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._api_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        self._model = (model or os.getenv("LLM_MODEL") or DEFAULT_OPENAI_MODEL).strip()
        self._timeout = timeout
        self._client: Any = None

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        return bool(self._api_key)

    def _get_client(self) -> Any:
        if self._client is None:
            if not self.is_available():
                raise LLMAuthenticationError(
                    "OPENAI_API_KEY is not configured in environment or settings."
                )
            try:
                from openai import OpenAI
                self._client = OpenAI(
                    api_key=self._api_key,
                    timeout=self._timeout,
                )
            except ImportError as err:
                raise LLMError(f"openai package is not installed: {err}") from err
        return self._client

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = 600,
        **kwargs: Any,
    ) -> LLMResult:
        client = self._get_client()

        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            import openai

            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )

            choice = response.choices[0]
            content = (choice.message.content or "").strip()

            usage_dict: dict[str, int] = {}
            if response.usage:
                usage_dict = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            return LLMResult(
                content=content,
                model=response.model or self._model,
                provider=self.provider_name,
                usage=usage_dict,
                raw_response=response,
            )

        except openai.AuthenticationError as exc:
            raise LLMAuthenticationError(f"OpenAI authentication failed: {exc.message}") from exc
        except openai.RateLimitError as exc:
            raise LLMRateLimitError(f"OpenAI rate limit / quota exceeded: {exc.message}") from exc
        except openai.APITimeoutError as exc:
            raise LLMTimeoutError(f"OpenAI request timed out after {self._timeout}s: {exc}") from exc
        except openai.APIConnectionError as exc:
            raise LLMUnavailableError(f"Could not connect to OpenAI service: {exc}") from exc
        except openai.APIError as exc:
            raise LLMError(f"OpenAI API returned an error: {exc.message}") from exc
        except Exception as exc:
            raise LLMError(f"Unexpected error communicating with OpenAI: {str(exc)}") from exc
