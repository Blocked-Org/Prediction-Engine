-- 1. Extensions & Infrastructure

-- Enable the TimescaleDB extension for time-series optimization
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create an application database role/user that will be used by the backend.
-- NOTE: Change 'secure_password_here' to a strong password in production.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password_here';
    END IF;
END
$$;

-- 2. Dimension Tables (Must include RLS)

-- Stores registered businesses
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standardized marketing channels (e.g., Meta, Google, TikTok, Organic)
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_name VARCHAR(255) NOT NULL
);

-- Stores the demographic targets from our onboarding sequence
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    target_age_range VARCHAR(50),
    target_gender VARCHAR(50),
    target_interest VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);


-- 3. Fact Table / Hypertable (Must include RLS and TimescaleDB optimization)

-- Core time-series table that replaces static aggregate inputs
CREATE TABLE IF NOT EXISTS daily_ad_performance (
    date DATE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    spend DECIMAL(12, 2) DEFAULT 0.00,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0.00,
    -- For a TimescaleDB hypertable, the partition column must be part of the primary key.
    PRIMARY KEY (date, tenant_id, campaign_id)
);

-- Convert this table into a TimescaleDB hypertable partitioned by the date column.
SELECT create_hypertable('daily_ad_performance', 'date', if_not_exists => TRUE);

-- Create indexes optimized for querying time-series data grouped by campaign_id and tenant_id
-- TimescaleDB automatically creates an index on the time column, but compound indexes help specific queries
CREATE INDEX IF NOT EXISTS idx_daily_performance_tenant_campaign_date 
    ON daily_ad_performance (tenant_id, campaign_id, date DESC);

-- Standard foreign key indexes
CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_channel_id ON campaigns(channel_id);


-- 4. Security (Row-Level Security)

-- Grant usage and permissions to the application user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Enable ROW LEVEL SECURITY on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ad_performance ENABLE ROW LEVEL SECURITY;

-- Write the RLS policies ensuring that app_user can only access rows 
-- where the tenant_id matches the current session's tenant context.
-- NULLIF handles empty strings to avoid UUID casting errors.

CREATE POLICY tenant_isolation_policy ON tenants
    AS PERMISSIVE FOR ALL
    TO app_user
    USING (id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
    WITH CHECK (id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

CREATE POLICY tenant_isolation_policy ON channels
    AS PERMISSIVE FOR ALL
    TO app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

CREATE POLICY tenant_isolation_policy ON campaigns
    AS PERMISSIVE FOR ALL
    TO app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);

CREATE POLICY tenant_isolation_policy ON daily_ad_performance
    AS PERMISSIVE FOR ALL
    TO app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid);
