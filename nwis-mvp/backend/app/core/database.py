from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


engine = create_engine(settings.database_url) if settings.database_url else None
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
