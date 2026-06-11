"""
Multi-tenant database layer for PredictionEngine.

Provides:
  - ``tenant_context`` ContextVar — thread/async-safe tenant ID propagation
  - SQLAlchemy engine + session with automatic RLS injection
  - ``get_db_session`` FastAPI dependency that extracts X-Tenant-ID from
    request headers and yields an isolated, tenant-scoped DB session

Security model
--------------
Every SQLAlchemy session automatically executes
``SET LOCAL app.current_tenant_id = :tenant_id`` at the start of each
transaction when a tenant_id is present in the ContextVar.  This pairs
with Postgres Row-Level Security policies created in Alembic migration 001.

``SET LOCAL`` scopes the setting to the *current transaction*, so it is
automatically reverted on COMMIT/ROLLBACK — no cleanup needed.

When running in SQLite demo mode, RLS is skipped entirely (SQLite does
not support SET LOCAL or row-level security).
"""

from __future__ import annotations

import logging
import uuid
from typing import Generator, Optional
from contextvars import ContextVar

from fastapi import Header, HTTPException
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session

from src.api.models import Base  # single shared declarative base  # noqa: F401
from src.api.config import get_settings

logger = logging.getLogger(__name__)

# ── Connection URL ──────────────────────────────────────────────────
settings = get_settings()
DATABASE_URL = settings.DATABASE_URL

_is_sqlite = DATABASE_URL.startswith("sqlite")

# ── Thread-safe ContextVar for current tenant ───────────────────────
# ContextVar natively supports async/await and thread-based concurrency
# models in FastAPI.  Default is ``None`` (no tenant → RLS blocks everything
# for app_user).
tenant_context: ContextVar[Optional[str]] = ContextVar(
    "tenant_context", default=None
)

# ── SQLAlchemy Engine & Session Setup ───────────────────────────────
if _is_sqlite:
    # SQLite needs check_same_thread=False for FastAPI's async model
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
    logger.info("Using SQLite database (demo/offline mode): %s", DATABASE_URL)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    logger.info("Using PostgreSQL database")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Auto-create tables for SQLite (no Alembic needed) ───────────────
if _is_sqlite:
    Base.metadata.create_all(bind=engine)
    logger.info("SQLite tables created/verified via create_all()")


# ── RLS Injection via Session Event ─────────────────────────────────
# We attach to ``Session.after_begin`` so that the SET LOCAL fires exactly
# once per *transaction*, not on every raw cursor call.  This avoids:
#   • infinite-recursion guards needed by ``before_cursor_execute``
#   • SQL-injection risk from f-string interpolation on the cursor
#
# ``SET LOCAL`` is automatically reverted at the end of the transaction.

@event.listens_for(Session, "after_begin")
def _inject_tenant_context(
    session: Session, transaction, connection
) -> None:
    """Inject RLS tenant context at the start of every transaction."""
    if connection.dialect.name != "postgresql":
        return

    tenant_id = tenant_context.get()
    if tenant_id is None:
        return

    # Validate UUID format to prevent injection via a malformed header.
    try:
        uuid.UUID(tenant_id)
    except ValueError:
        logger.warning(
            "Invalid tenant_id format in ContextVar — skipping SET LOCAL: %s",
            tenant_id,
        )
        return

    connection.execute(
        text("SET LOCAL app.current_tenant_id = :tid"),
        {"tid": tenant_id},
    )


# ── FastAPI Dependency ──────────────────────────────────────────────

def get_db_session(
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
) -> Generator[Session, None, None]:
    """
    FastAPI dependency that extracts the tenant_id from the incoming
    request header, binds it to the ContextVar, and yields an isolated
    database session.

    The ``after_begin`` event listener above automatically executes
    ``SET LOCAL app.current_tenant_id`` for every transaction opened
    within this session.

    In SQLite demo mode, the X-Tenant-ID header is optional.
    """
    if not x_tenant_id and not _is_sqlite:
        raise HTTPException(
            status_code=400,
            detail="X-Tenant-ID header is missing. Tenant context is required.",
        )

    if x_tenant_id:
        # Validate UUID early so callers get a 400, not a 500.
        try:
            uuid.UUID(x_tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="X-Tenant-ID header is not a valid UUID.",
            )

    # Set the ContextVar for the current request flow
    token = tenant_context.set(x_tenant_id)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Reset the context variable to its previous state to prevent bleed-over
        tenant_context.reset(token)

def get_global_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session WITHOUT injecting
    tenant context. This should only be used for global operations
    (like public docs config) that are not tenant-scoped.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
