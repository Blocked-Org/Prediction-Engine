"""add_campaign_workspaces_table

Creates the ``campaign_workspaces`` table that replaces both the volatile
in-memory ``_user_campaigns`` dict and the removed Neo4j graph store.

Supports up to 3 workspaces per user with JSONB columns for campaign data,
cached simulation results, and competitor intelligence.

Revision ID: 002
Revises: 001
Create Date: 2026-06-10 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 11. campaign_workspaces (replaces Neo4j + in-memory dict)
    # ------------------------------------------------------------------
    op.create_table(
        'campaign_workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('clerk_user_id', sa.String(255), nullable=False),
        sa.Column('workspace_name', sa.String(255), nullable=False,
                  server_default="'Default Workspace'"),
        sa.Column('workspace_slot', sa.SmallInteger, nullable=False,
                  server_default='1'),
        sa.Column('campaign_id', sa.String(36), nullable=False),

        # JSONB payload columns
        sa.Column('campaign_data', postgresql.JSON, nullable=True,
                  comment='Full campaign dict: budget, cpc, channels, audience, etc.'),
        sa.Column('simulation_result', postgresql.JSON, nullable=True,
                  comment='Cached DashboardResultsResponse payload.'),
        sa.Column('competitor_context', postgresql.JSON, nullable=True,
                  comment='Array of competitor scrape results (replaces Neo4j CompetitorContext).'),

        sa.Column('is_active', sa.Boolean, nullable=False,
                  server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),

        # Constraints
        sa.CheckConstraint(
            'workspace_slot >= 1 AND workspace_slot <= 3',
            name='ck_workspace_slot_range',
        ),
        sa.UniqueConstraint(
            'clerk_user_id', 'workspace_slot',
            name='uq_user_workspace_slot',
        ),
    )

    # Indexes
    op.create_index(
        'idx_campaign_workspaces_tenant_id',
        'campaign_workspaces', ['tenant_id'],
    )
    op.create_index(
        'idx_campaign_workspaces_clerk_user_id',
        'campaign_workspaces', ['clerk_user_id'],
    )

    # ------------------------------------------------------------------
    # RLS — same pattern as migration 001
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE campaign_workspaces ENABLE ROW LEVEL SECURITY;")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON campaign_workspaces
            AS PERMISSIVE FOR ALL
            TO app_user
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);
    """)

    # Grant access to app_user role
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE "
        "ON campaign_workspaces TO app_user;"
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON campaign_workspaces;")
    op.execute("ALTER TABLE campaign_workspaces DISABLE ROW LEVEL SECURITY;")
    op.drop_table('campaign_workspaces')
