"""initial_schema

Translated from src/api/db/01_init.sql and extended with new tables:
  users, organizations, transactions, simulation_results.

Includes:
  - All 8 dimension/fact tables with UUID primary keys
  - Composite indexes matching the original SQL
  - TimescaleDB hypertable conversion for daily_ad_performance
  - Row-Level Security policies for tenant isolation
  - GRANT statements for the app_user role

Revision ID: 001
Revises:
Create Date: 2026-05-20 21:20:22.272822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 0. Extensions & Roles
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
                CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password_here';
            END IF;
        END
        $$;
    """)

    # ------------------------------------------------------------------
    # 1. tenants
    # ------------------------------------------------------------------
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
    )

    # ------------------------------------------------------------------
    # 2. organizations  (new)
    # ------------------------------------------------------------------
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('org_name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
    )

    # ------------------------------------------------------------------
    # 3. users  (new)
    # ------------------------------------------------------------------
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('email', sa.String(320), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255)),
        sa.Column('role', sa.String(50), server_default='member'),
        sa.Column('clerk_user_id', sa.String(255), unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
    )

    # ------------------------------------------------------------------
    # 4. channels  (from SQL)
    # ------------------------------------------------------------------
    op.create_table(
        'channels',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('channel_name', sa.String(255), nullable=False),
    )
    op.create_index('idx_channels_tenant_id', 'channels', ['tenant_id'])

    # ------------------------------------------------------------------
    # 5. campaigns  (from SQL)
    # ------------------------------------------------------------------
    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('channel_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('channels.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('campaign_name', sa.String(255), nullable=False),
        sa.Column('target_age_range', sa.String(50)),
        sa.Column('target_gender', sa.String(50)),
        sa.Column('target_interest', sa.String(255)),
        sa.Column('status', sa.String(50), server_default='active'),
    )
    op.create_index('idx_campaigns_tenant_id', 'campaigns', ['tenant_id'])
    op.create_index('idx_campaigns_channel_id', 'campaigns', ['channel_id'])

    # ------------------------------------------------------------------
    # 6. daily_ad_performance  (from SQL — composite PK, TimescaleDB)
    # ------------------------------------------------------------------
    op.create_table(
        'daily_ad_performance',
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('campaigns.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('spend', sa.Numeric(12, 2), server_default='0.00'),
        sa.Column('impressions', sa.Integer, server_default='0'),
        sa.Column('clicks', sa.Integer, server_default='0'),
        sa.Column('conversions', sa.Integer, server_default='0'),
        sa.Column('revenue', sa.Numeric(12, 2), server_default='0.00'),
        sa.PrimaryKeyConstraint('date', 'tenant_id', 'campaign_id'),
    )

    # Convert to TimescaleDB hypertable
    op.execute(
        "SELECT create_hypertable('daily_ad_performance', 'date', "
        "if_not_exists => TRUE);"
    )

    op.create_index(
        'idx_daily_performance_tenant_campaign_date',
        'daily_ad_performance',
        ['tenant_id', 'campaign_id', sa.text('date DESC')],
    )

    # ------------------------------------------------------------------
    # 7. transactions  (new)
    # ------------------------------------------------------------------
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('campaigns.id', ondelete='SET NULL')),
        sa.Column('amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='USD'),
        sa.Column('type', sa.String(50), server_default='spend'),
        sa.Column('description', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
    )

    # ------------------------------------------------------------------
    # 8. simulation_results  (new)
    # ------------------------------------------------------------------
    op.create_table(
        'simulation_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('campaigns.id', ondelete='SET NULL')),
        sa.Column('projected_roi', sa.Numeric(10, 4)),
        sa.Column('incremental_roas', sa.Numeric(10, 4)),
        sa.Column('pareto_budgets', postgresql.JSON),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
    )

    # ------------------------------------------------------------------
    # 9. Grants & Row-Level Security
    # ------------------------------------------------------------------
    op.execute("GRANT USAGE ON SCHEMA public TO app_user;")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE "
        "ON ALL TABLES IN SCHEMA public TO app_user;"
    )

    # Enable RLS on every tenant-scoped table
    _rls_tables_by_column = {
        'tenants': 'id',
        'organizations': 'tenant_id',
        'users': 'tenant_id',
        'channels': 'tenant_id',
        'campaigns': 'tenant_id',
        'daily_ad_performance': 'tenant_id',
        'transactions': 'tenant_id',
        'simulation_results': 'tenant_id',
    }

    for table, col in _rls_tables_by_column.items():
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation_policy ON {table}
                AS PERMISSIVE FOR ALL
                TO app_user
                USING ({col} = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
                WITH CHECK ({col} = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);
        """)


def downgrade() -> None:
    # Drop RLS policies first (must happen before table drops)
    _rls_tables = [
        'simulation_results', 'transactions', 'daily_ad_performance',
        'campaigns', 'channels', 'users', 'organizations', 'tenants',
    ]
    for table in _rls_tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    # Drop tables in reverse dependency order
    op.drop_table('simulation_results')
    op.drop_table('transactions')
    op.drop_table('daily_ad_performance')
    op.drop_table('campaigns')
    op.drop_table('channels')
    op.drop_table('users')
    op.drop_table('organizations')
    op.drop_table('tenants')
