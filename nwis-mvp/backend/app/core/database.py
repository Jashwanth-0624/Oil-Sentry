from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


def normalize_database_url(url: str | None) -> str | None:
	if not url:
		return url
	if url.startswith("postgres://"):
		url = url.replace("postgres://", "postgresql://", 1)
	return url


db_url = normalize_database_url(settings.database_url)
engine = create_engine(db_url) if db_url else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
	pass


def get_db() -> Generator[Session, None, None]:
	if engine is None:
		raise HTTPException(
			status_code=503,
			detail="DATABASE_URL is not configured. Create backend/.env from backend/.env.example.",
		)

	database = SessionLocal()
	try:
		yield database
	finally:
		database.close()
