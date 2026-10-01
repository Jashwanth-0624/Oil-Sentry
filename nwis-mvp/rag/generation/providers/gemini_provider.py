"""Google Gemini provider for grounded NWIS generation."""

from __future__ import annotations

import os
import logging
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

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"
# Structured, evidence-grounded prompts can take longer than short chat prompts.
# Keep this below the browser request allowance while allowing the model to finish.
DEFAULT_TIMEOUT_SECONDS = 40.0

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    """Official Google Gen AI SDK implementation of the shared provider contract."""

    def __init__(self, api_key: str | None = None, model: str | None = None, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> None:
        self._api_key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
        self._model = (model or os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL).strip()
        self._timeout = timeout
        self._client: Any = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        return bool(self._api_key)

    def _get_client(self) -> Any:
        if not self.is_available():
            raise LLMAuthenticationError("Gemini API key is not configured.")
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
            except ImportError as exc:
                raise LLMError("google-genai package is not installed.") from exc
        return self._client

    def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.0,
                 max_tokens: int | None = 800, **kwargs: Any) -> LLMResult:
        client = self._get_client()
        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens,
                response_mime_type=kwargs.pop("response_mime_type", None),
                response_schema=kwargs.pop("response_schema", None),
                http_options=types.HttpOptions(timeout=int(self._timeout * 1000)),
            )
            response = client.models.generate_content(model=self._model, contents=prompt, config=config)
            content = (getattr(response, "text", None) or "").strip()
            usage_metadata = getattr(response, "usage_metadata", None)
            usage = {}
            if usage_metadata:
                usage = {"prompt_tokens": getattr(usage_metadata, "prompt_token_count", 0) or 0,
                         "completion_tokens": getattr(usage_metadata, "candidates_token_count", 0) or 0,
                         "total_tokens": getattr(usage_metadata, "total_token_count", 0) or 0}
            return LLMResult(content=content, model=self._model, provider=self.provider_name, usage=usage, raw_response=response)
        except Exception as exc:
            logger.warning("Gemini generation request failed: %s", exc)
            message = str(exc).lower()
            if "connection" in message or "unavailable" in message or "503" in message or "winerror" in message:
                raise LLMUnavailableError("Gemini service is unavailable.") from exc
            if "api key" in message or "authentication" in message or "unauthenticated" in message or "permission" in message:
                raise LLMAuthenticationError("Gemini authentication failed.") from exc
            if "429" in message or "quota" in message or "rate" in message:
                raise LLMRateLimitError("Gemini rate limit reached.") from exc
            if "timeout" in message or "deadline" in message:
                raise LLMTimeoutError("Gemini request timed out.") from exc
            raise LLMError("Gemini generation failed.") from exc
