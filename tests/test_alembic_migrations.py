"""
Alembic migration round-trip tests.

Verifies that the ``001_initial_schema`` migration can be upgraded and
then cleanly downgraded without leaving artefacts behind.

These tests run against a **real** (or Docker-based) PostgreSQL instance.
Set ``TEST_DATABASE_URL`` in the environment or ``.env`` to point to a
disposable test database.  If the variable is missing, all tests are
automatically skipped with a clear message.

Requirements:
    pip install pytest sqlalchemy alembic psycopg2-binary python-dotenv

Usage:
    pytest tests/test_alembic_migrations.py -v
"""

from __future__ import annotations

import os

import pytest
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from alembic.config import Config
from alembic import command

# ── Configuration ────────────────────────────────────────────────────

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

# Tables created by migration 001
EXPECTED_TABLES = {
    "tenants",
    "organizations",
    "users",
    "channels",
    "campaigns",
    "daily_ad_performance",
    "transactions",
    "simulation_results",
}

# Custom indexes defined in migration 001 (beyond auto-generated PK/FK)
EXPECTED_CUSTOM_INDEXES = {
    "idx_channels_tenant_id",
    "idx_campaigns_tenant_id",
    "idx_campaigns_channel_id",
    "idx_daily_performance_tenant_campaign_date",
}

# Skip all tests if no test database is configured
pytestmark = pytest.mark.skipif(
    TEST_DATABASE_URL is None,
    reason="TEST_DATABASE_URL not set — skipping integration migration tests.",
)


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def alembic_config() -> Config:
    """Return an Alembic ``Config`` pointed at the project root."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)  # type: ignore[arg-type]
    return cfg


@pytest.fixture(scope="module")
def test_engine():
    """Create a disposable SQLAlchemy engine for the test database."""
    engine = create_engine(TEST_DATABASE_URL)  # type: ignore[arg-type]
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True, scope="module")
def _run_full_round_trip(alembic_config, test_engine):
    """
    Module-scoped fixture that performs the full upgrade → yield → downgrade
    cycle once per test module.  Individual tests inspect state after upgrade.
    """
    # Upgrade to head
    command.upgrade(alembic_config, "head")

    yield  # ← tests run here, schema is at head

    # Downgrade back to base (empty)
    command.downgrade(alembic_config, "base")


# ── Upgrade Tests ────────────────────────────────────────────────────


class TestUpgrade:
    """Verify the schema after ``alembic upgrade head``."""

    def test_all_expected_tables_exist(self, test_engine):
        inspector = inspect(test_engine)
        actual_tables = set(inspector.get_table_names())
        missing = EXPECTED_TABLES - actual_tables
        assert not missing, f"Missing tables after upgrade: {missing}"

    def test_alembic_version_table_exists(self, test_engine):
        inspector = inspect(test_engine)
        assert "alembic_version" in inspector.get_table_names()

    def test_alembic_version_is_001(self, test_engine):
        with Session(test_engine) as session:
            row = session.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            assert row == "001"

    def test_custom_indexes_exist(self, test_engine):
        inspector = inspect(test_engine)
        all_indexes: set[str] = set()
        for table in EXPECTED_TABLES:
            for idx in inspector.get_indexes(table):
                all_indexes.add(idx["name"])

        missing = EXPECTED_CUSTOM_INDEXES - all_indexes
        assert not missing, f"Missing indexes after upgrade: {missing}"

    def test_tenants_table_columns(self, test_engine):
        inspector = inspect(test_engine)
        columns = {c["name"] for c in inspector.get_columns("tenants")}
        assert {"id", "company_name", "created_at"} <= columns

    def test_users_table_columns(self, test_engine):
        inspector = inspect(test_engine)
        columns = {c["name"] for c in inspector.get_columns("users")}
        expected = {"id", "tenant_id", "email", "full_name", "role", "clerk_user_id", "created_at"}
        assert expected <= columns

    def test_campaigns_table_columns(self, test_engine):
        inspector = inspect(test_engine)
        columns = {c["name"] for c in inspector.get_columns("campaigns")}
        expected = {
            "id", "tenant_id", "channel_id", "campaign_name",
            "target_age_range", "target_gender", "target_interest", "status",
        }
        assert expected <= columns

    def test_daily_ad_performance_composite_pk(self, test_engine):
        inspector = inspect(test_engine)
        pk = inspector.get_pk_constraint("daily_ad_performance")
        assert set(pk["constrained_columns"]) == {"date", "tenant_id", "campaign_id"}

    def test_simulation_results_has_json_column(self, test_engine):
        inspector = inspect(test_engine)
        columns = {c["name"]: c for c in inspector.get_columns("simulation_results")}
        assert "pareto_budgets" in columns

    def test_rls_enabled_on_tenants(self, test_engine):
        """Verify RLS is enabled on the tenants table (Postgres-specific)."""
        with Session(test_engine) as session:
            result = session.execute(
                text(
                    "SELECT relrowsecurity FROM pg_class "
                    "WHERE relname = 'tenants'"
                )
            ).scalar_one()
            assert result is True, "RLS should be enabled on tenants"

    def test_rls_enabled_on_all_tables(self, test_engine):
        """Verify RLS is enabled on every expected table."""
        with Session(test_engine) as session:
            for table in EXPECTED_TABLES:
                result = session.execute(
                    text(
                        "SELECT relrowsecurity FROM pg_class "
                        f"WHERE relname = '{table}'"
                    )
                ).scalar_one()
                assert result is True, f"RLS should be enabled on {table}"


# ── Downgrade Tests ──────────────────────────────────────────────────


class TestDowngrade:
    """
    Verify the schema after ``alembic downgrade base``.

    Because the autouse fixture already runs downgrade at module teardown,
    these tests verify the *post-downgrade* state by running their own
    explicit upgrade→downgrade cycle.
    """

    def test_downgrade_removes_all_tables(self, alembic_config, test_engine):
        """
        Full round-trip: upgrade to head, then downgrade to base.
        After downgrade, only ``alembic_version`` (empty) should remain.
        """
        # Re-upgrade (fixture already downgraded)
        command.upgrade(alembic_config, "head")
        command.downgrade(alembic_config, "base")

        inspector = inspect(test_engine)
        remaining = set(inspector.get_table_names()) - {"alembic_version"}
        assert not remaining, (
            f"Tables still present after downgrade: {remaining}"
        )

    def test_downgrade_empties_alembic_version(self, alembic_config, test_engine):
        """After downgrade, the alembic_version table should be empty."""
        with Session(test_engine) as session:
            count = session.execute(
                text("SELECT count(*) FROM alembic_version")
            ).scalar_one()
            assert count == 0
