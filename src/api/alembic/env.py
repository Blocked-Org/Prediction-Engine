"""
Alembic environment configuration with multi-tenant RLS support.

Key features
------------
- Reads DATABASE_URL from the environment (via python-dotenv).
- Imports ``Base.metadata`` from ``src.api.models`` so that autogenerate
  can discover all ORM tables.
- Supports an optional ``--tenant-id`` context attribute.  When provided,
  every migration statement is wrapped inside a transaction that first
  executes ``SET LOCAL app.current_tenant_id = '<id>'`` — allowing
  migrations to pass Row-Level Security policies when running as
  ``app_user``.
"""

from __future__ import annotations

import os
import logging
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text

from alembic import context

# ── Load .env early so DATABASE_URL is available ────────────────────
load_dotenv()

# ── Alembic Config object ──────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging (alembic.ini [loggers])
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger("alembic.env")

# ── Override sqlalchemy.url from the environment ────────────────────
# Priority:
#   1. DATABASE_URL env var (explicit full connection string)
#   2. Build from individual POSTGRES_* env vars (CI / Docker friendly)
#   3. Dev default (local app_user)
database_url = os.getenv("DATABASE_URL")

if not database_url:
    pg_user = os.getenv("POSTGRES_USER")
    pg_password = os.getenv("POSTGRES_PASSWORD")
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    pg_db = os.getenv("POSTGRES_DB", "postgres")

    if pg_user and pg_password:
        database_url = (
            f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"
        )
    else:
        # Local development fallback
        database_url = "postgresql://app_user:secure_password_here@localhost:5432/postgres"

config.set_main_option("sqlalchemy.url", database_url)

# ── Target metadata — the single source of truth for the schema ────
# Import *after* dotenv so any model-level env reads also work.
from src.api.models import Base  # noqa: E402

target_metadata = Base.metadata

# ── Helpers ─────────────────────────────────────────────────────────

def _get_tenant_id() -> str | None:
    """Return a tenant_id if one was passed via ``-x tenant_id=<uuid>``.

    Usage::

        alembic -x tenant_id=<uuid> upgrade head
    """
    return context.get_x_argument(as_dictionary=True).get("tenant_id")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emit SQL to stdout.

    In this mode we only need the URL, not an actual Engine.
    The ``--sql`` flag triggers this path.
    """
    url = config.get_main_option("sqlalchemy.url")
    tenant_id = _get_tenant_id()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        if tenant_id:
            context.execute(
                f"SET LOCAL app.current_tenant_id = '{tenant_id}';"
            )
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connect to the live database.

    If a tenant_id is supplied via ``-x tenant_id=<uuid>``, we inject a
    ``SET LOCAL`` command at the start of the migration transaction so
    that all statements executed within the migration satisfy RLS
    policies.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    tenant_id = _get_tenant_id()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            if tenant_id:
                logger.info(
                    "Running migration with RLS tenant context: %s",
                    tenant_id,
                )
                connection.execute(
                    text(
                        f"SET LOCAL app.current_tenant_id = '{tenant_id}';"
                    )
                )
            context.run_migrations()


# ── Entry point ─────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
