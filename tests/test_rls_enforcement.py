"""
Row-Level Security enforcement tests.

Asserts that the Postgres RLS policies created in Alembic migration 001
correctly isolate data between tenants when queries are executed as
``app_user``.

Test strategy
-------------
1. Connect as a **superuser** (``TEST_DATABASE_URL``) to seed two tenants
   with rows in ``tenants``, ``channels``, and ``campaigns``.
2. Connect as ``app_user`` (``TEST_APP_USER_URL``) and verify that:
   - Setting ``app.current_tenant_id`` to tenant A only returns tenant A's rows.
   - Setting it to tenant B only returns tenant B's rows.
   - Without setting any tenant context, **no rows** are returned (default-deny).

Environment variables
---------------------
- ``TEST_DATABASE_URL``   — superuser connection (for seeding & schema setup)
- ``TEST_APP_USER_URL``   — ``app_user`` connection (for RLS assertions)

If either is missing, all tests are skipped automatically.

Usage::

    pytest tests/test_rls_enforcement.py -v
"""

from __future__ import annotations

import os
import uuid

import pytest
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

# ── Configuration ────────────────────────────────────────────────────

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
TEST_APP_USER_URL = os.getenv("TEST_APP_USER_URL")

pytestmark = pytest.mark.skipif(
    TEST_DATABASE_URL is None or TEST_APP_USER_URL is None,
    reason=(
        "TEST_DATABASE_URL and/or TEST_APP_USER_URL not set — "
        "skipping RLS enforcement tests."
    ),
)

# ── Fixtures ─────────────────────────────────────────────────────────

TENANT_A_ID = str(uuid.uuid4())
TENANT_B_ID = str(uuid.uuid4())
CHANNEL_A_ID = str(uuid.uuid4())
CHANNEL_B_ID = str(uuid.uuid4())
CAMPAIGN_A_ID = str(uuid.uuid4())
CAMPAIGN_B_ID = str(uuid.uuid4())


@pytest.fixture(scope="module")
def superuser_engine():
    engine = create_engine(TEST_DATABASE_URL)  # type: ignore[arg-type]
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def app_user_engine():
    engine = create_engine(TEST_APP_USER_URL)  # type: ignore[arg-type]
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True, scope="module")
def seed_test_data(superuser_engine):
    """
    Seed two tenants with one channel and one campaign each.
    Uses the superuser connection which bypasses RLS.
    Cleans up after all tests in the module.
    """
    with Session(superuser_engine) as session:
        # --- Tenant A ---
        session.execute(
            text("INSERT INTO tenants (id, company_name) VALUES (:id, :name)"),
            {"id": TENANT_A_ID, "name": "Tenant Alpha"},
        )
        session.execute(
            text(
                "INSERT INTO channels (id, tenant_id, channel_name) "
                "VALUES (:id, :tid, :name)"
            ),
            {"id": CHANNEL_A_ID, "tid": TENANT_A_ID, "name": "Alpha Meta Ads"},
        )
        session.execute(
            text(
                "INSERT INTO campaigns "
                "(id, tenant_id, channel_id, campaign_name) "
                "VALUES (:id, :tid, :cid, :name)"
            ),
            {
                "id": CAMPAIGN_A_ID,
                "tid": TENANT_A_ID,
                "cid": CHANNEL_A_ID,
                "name": "Alpha Q1 Push",
            },
        )

        # --- Tenant B ---
        session.execute(
            text("INSERT INTO tenants (id, company_name) VALUES (:id, :name)"),
            {"id": TENANT_B_ID, "name": "Tenant Bravo"},
        )
        session.execute(
            text(
                "INSERT INTO channels (id, tenant_id, channel_name) "
                "VALUES (:id, :tid, :name)"
            ),
            {"id": CHANNEL_B_ID, "tid": TENANT_B_ID, "name": "Bravo Google Ads"},
        )
        session.execute(
            text(
                "INSERT INTO campaigns "
                "(id, tenant_id, channel_id, campaign_name) "
                "VALUES (:id, :tid, :cid, :name)"
            ),
            {
                "id": CAMPAIGN_B_ID,
                "tid": TENANT_B_ID,
                "cid": CHANNEL_B_ID,
                "name": "Bravo Launch",
            },
        )
        session.commit()

    yield

    # Cleanup
    with Session(superuser_engine) as session:
        session.execute(
            text("DELETE FROM campaigns WHERE tenant_id IN (:a, :b)"),
            {"a": TENANT_A_ID, "b": TENANT_B_ID},
        )
        session.execute(
            text("DELETE FROM channels WHERE tenant_id IN (:a, :b)"),
            {"a": TENANT_A_ID, "b": TENANT_B_ID},
        )
        session.execute(
            text("DELETE FROM tenants WHERE id IN (:a, :b)"),
            {"a": TENANT_A_ID, "b": TENANT_B_ID},
        )
        session.commit()


# ── Helpers ──────────────────────────────────────────────────────────


def _set_tenant_and_query(engine, tenant_id: str | None, table: str):
    """
    Open a connection as app_user, optionally SET the tenant context,
    and SELECT * from the given table.
    """
    with engine.connect() as conn:
        if tenant_id is not None:
            conn.execute(
                text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
            )
        rows = conn.execute(text(f"SELECT * FROM {table}")).fetchall()
        conn.rollback()  # SET LOCAL is scoped to transaction
        return rows


# ── Tests: Tenant A context ─────────────────────────────────────────


class TestTenantAIsolation:
    """With tenant context set to Tenant A, only A's data is visible."""

    def test_tenants_only_a(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_A_ID, "tenants")
        ids = {str(r[0]) for r in rows}
        assert TENANT_A_ID in ids
        assert TENANT_B_ID not in ids

    def test_channels_only_a(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_A_ID, "channels")
        tenant_ids = {str(r[1]) for r in rows}  # tenant_id is 2nd column
        assert all(tid == TENANT_A_ID for tid in tenant_ids)

    def test_campaigns_only_a(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_A_ID, "campaigns")
        tenant_ids = {str(r[1]) for r in rows}  # tenant_id is 2nd column
        assert all(tid == TENANT_A_ID for tid in tenant_ids)


# ── Tests: Tenant B context ─────────────────────────────────────────


class TestTenantBIsolation:
    """With tenant context set to Tenant B, only B's data is visible."""

    def test_tenants_only_b(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_B_ID, "tenants")
        ids = {str(r[0]) for r in rows}
        assert TENANT_B_ID in ids
        assert TENANT_A_ID not in ids

    def test_channels_only_b(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_B_ID, "channels")
        tenant_ids = {str(r[1]) for r in rows}
        assert all(tid == TENANT_B_ID for tid in tenant_ids)

    def test_campaigns_only_b(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, TENANT_B_ID, "campaigns")
        tenant_ids = {str(r[1]) for r in rows}
        assert all(tid == TENANT_B_ID for tid in tenant_ids)


# ── Tests: No tenant context (default-deny) ─────────────────────────


class TestNoTenantContext:
    """
    Without setting app.current_tenant_id, RLS should return NO rows
    for app_user (the USING clause evaluates to NULL ≠ any UUID).
    """

    def test_tenants_returns_empty(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, None, "tenants")
        assert len(rows) == 0, "No rows should be visible without tenant context"

    def test_channels_returns_empty(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, None, "channels")
        assert len(rows) == 0

    def test_campaigns_returns_empty(self, app_user_engine):
        rows = _set_tenant_and_query(app_user_engine, None, "campaigns")
        assert len(rows) == 0


# ── Tests: Cross-tenant write prevention ─────────────────────────────


class TestCrossTenantWritePrevention:
    """
    Verify that app_user under tenant A's context cannot INSERT a row
    with tenant B's ID — the WITH CHECK clause should reject it.
    """

    def test_cannot_insert_channel_for_other_tenant(self, app_user_engine):
        with app_user_engine.connect() as conn:
            conn.execute(
                text(f"SET LOCAL app.current_tenant_id = '{TENANT_A_ID}'")
            )
            with pytest.raises(Exception):
                # Attempting to insert a channel for Tenant B while
                # authenticated as Tenant A should fail RLS WITH CHECK.
                conn.execute(
                    text(
                        "INSERT INTO channels (id, tenant_id, channel_name) "
                        "VALUES (:id, :tid, :name)"
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "tid": TENANT_B_ID,
                        "name": "Hijacked Channel",
                    },
                )
            conn.rollback()

    def test_cannot_insert_campaign_for_other_tenant(self, app_user_engine):
        with app_user_engine.connect() as conn:
            conn.execute(
                text(f"SET LOCAL app.current_tenant_id = '{TENANT_A_ID}'")
            )
            with pytest.raises(Exception):
                conn.execute(
                    text(
                        "INSERT INTO campaigns "
                        "(id, tenant_id, channel_id, campaign_name) "
                        "VALUES (:id, :tid, :cid, :name)"
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "tid": TENANT_B_ID,
                        "cid": CHANNEL_B_ID,
                        "name": "Hijacked Campaign",
                    },
                )
            conn.rollback()


# ── Tests: ContextVar integration ────────────────────────────────────


class TestContextVarIntegration:
    """
    Verify that the ``tenant_context`` ContextVar + ``after_begin``
    event in ``database.py`` correctly sets the Postgres session var.
    """

    def test_contextvar_sets_postgres_setting(self, superuser_engine):
        """
        Simulate what ``get_db_session`` does: set the ContextVar, open a
        session, and verify the Postgres-side setting is populated.
        """
        from src.api.db.database import tenant_context, SessionLocal

        token = tenant_context.set(TENANT_A_ID)
        try:
            db = SessionLocal()
            try:
                result = db.execute(
                    text("SHOW app.current_tenant_id")
                ).scalar_one()
                assert result == TENANT_A_ID
            finally:
                db.close()
        finally:
            tenant_context.reset(token)

    def test_contextvar_cleared_after_reset(self, superuser_engine):
        """After resetting the ContextVar, no tenant should be set."""
        from src.api.db.database import tenant_context

        assert tenant_context.get() is None
