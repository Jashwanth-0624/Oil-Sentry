"""Detect and optionally enable the PostgreSQL pgvector extension."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session


class PgVectorStatus:
    def __init__(self, available: bool, installed: bool, error: str | None = None) -> None:
        self.available = available
        self.installed = installed
        self.error = error

    @property
    def enabled(self) -> bool:
        return self.available and self.installed


def inspect_pgvector(connection: Connection) -> PgVectorStatus:
    rows = connection.execute(
        text(
            "SELECT name, default_version, installed_version "
            "FROM pg_available_extensions WHERE name = 'vector'"
        )
    ).fetchall()
    if not rows:
        return PgVectorStatus(
            available=False,
            installed=False,
            error=(
                "pgvector is not available in pg_available_extensions. "
                "CREATE EXTENSION vector failed because the extension is not installed "
                "on this PostgreSQL server. Do not substitute another vector database."
            ),
        )

    installed_version = rows[0][2]
    return PgVectorStatus(available=True, installed=installed_version is not None)


def try_enable_pgvector(engine: Engine) -> PgVectorStatus:
    with engine.connect() as connection:
        try:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            connection.commit()
        except Exception as exc:
            connection.rollback()
            status = inspect_pgvector(connection)
            message = f"{type(exc).__name__}: {exc}".split("PASSWORD")[0][:500]
            status.error = f"CREATE EXTENSION IF NOT EXISTS vector failed: {message}"
            return status
        return inspect_pgvector(connection)


def get_pgvector_status(bind: Engine | Session | Connection) -> PgVectorStatus:
    if isinstance(bind, Session):
        return inspect_pgvector(bind.connection())
    if isinstance(bind, Connection):
        return inspect_pgvector(bind)
    with bind.connect() as connection:
        return inspect_pgvector(connection)
