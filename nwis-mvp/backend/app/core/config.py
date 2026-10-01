import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

backend_dir = Path(__file__).resolve().parents[2]
if (backend_dir / ".env").exists():
	load_dotenv(backend_dir / ".env")
elif (backend_dir / "env").exists():
	load_dotenv(backend_dir / "env")


class Settings(BaseModel):
	database_url: str | None = os.getenv("DATABASE_URL")
	frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
	llm_provider: str | None = os.getenv("LLM_PROVIDER")
	openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
	gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
	gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
	llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
	embedding_model: str = os.getenv(
		"EMBEDDING_MODEL",
		"sentence-transformers/all-MiniLM-L6-v2",
	)
	rag_top_k: int = int(os.getenv("RAG_TOP_K", "5"))
	rag_min_similarity: float = float(os.getenv("RAG_MIN_SIMILARITY", "0.10"))
	alert_probability_threshold: float = float(os.getenv("ALERT_PROBABILITY_THRESHOLD", "0.75"))
	alert_sustained_frames: int = int(os.getenv("ALERT_SUSTAINED_FRAMES", "3"))
	alert_recovery_frames: int = int(os.getenv("ALERT_RECOVERY_FRAMES", "3"))


@lru_cache
def get_settings() -> Settings:
	return Settings()


settings = get_settings()
