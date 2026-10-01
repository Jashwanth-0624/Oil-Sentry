"""Local sentence-transformer embeddings for RAG chunks and queries."""

from __future__ import annotations

from functools import lru_cache
import os

DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class EmbeddingModel:
    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL) -> None:
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        # The application ships and operates with a locally cached embedding model.
        # Avoid network metadata checks during a query, which otherwise block RAG
        # when the host has no outbound Hugging Face access.
        local_files_only = os.getenv("EMBEDDING_LOCAL_FILES_ONLY", "true").lower() != "false"
        self._model = SentenceTransformer(model_name, local_files_only=local_files_only)

    @property
    def dimension(self) -> int:
        return int(self._model.get_sentence_embedding_dimension())

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        import numpy as np

        vectors = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        array = np.asarray(vectors, dtype=float)
        return array.tolist()

    def embed_query(self, text: str) -> list[float]:
        vectors = self.embed_texts([text])
        return vectors[0]


@lru_cache(maxsize=2)
def get_embedding_model(model_name: str = DEFAULT_EMBEDDING_MODEL) -> EmbeddingModel:
    return EmbeddingModel(model_name)
