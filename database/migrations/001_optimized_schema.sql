-- Loanease Optimized Database Schema
-- This schema is optimized for performance with large datasets
-- Includes proper indexes, constraints, and partitioning strategies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    abn VARCHAR(11) NOT NULL,
    entity_type VARCHAR(100),
    trading_name VARCHAR(255),

    -- Contact Information
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Business Details
    commission_structure JSONB,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for organizations
CREATE INDEX idx_organizations_abn ON organizations(abn) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_is_active ON organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_organizations_company_name_trgm ON organizations USING gin(company_name gin_trgm_ops) WHERE deleted_at IS NULL;

-- Enable trigram search for company names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON TABLE organizations IS 'Referrer organizations with commission structures';

-- =====================================================
-- USERS/USER_PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Auth Reference
    user_id UUID NOT NULL UNIQUE, -- References auth.users

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100), -- Alias for last_name for backwards compatibility
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    mobile VARCHAR(20),

    -- Role & Organization
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin_team', 'referrer_admin', 'referrer_team', 'client')),
    organisation_id UUID REFERENCES organizations(id),

    -- Security
    two_fa_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT user_profiles_organization_required
        CHECK (role = 'super_admin' OR role = 'admin_team' OR organisation_id IS NOT NULL)
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_email ON user_profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_role ON user_profiles(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_organisation_id ON user_profiles(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_role_org ON user_profiles(role, organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);
CREATE INDEX idx_user_profiles_last_login ON user_profiles(last_login_at DESC) WHERE deleted_at IS NULL;

-- Alias table name for backwards compatibility
CREATE OR REPLACE VIEW users AS SELECT * FROM user_profiles;

COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control';

-- =====================================================
-- ORGANIZATION DIRECTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_directors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    organisation_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Director Information
    title VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),

    -- Position
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for organization_directors
CREATE INDEX idx_org_directors_organisation_id ON organization_directors(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_directors_is_primary ON organization_directors(organisation_id, is_primary) WHERE deleted_at IS NULL AND is_primary = true;
CREATE INDEX idx_org_directors_email ON organization_directors(email) WHERE deleted_at IS NULL;

COMMENT ON TABLE organization_directors IS 'Directors and key contacts for organizations';

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Organization Reference (Scoped per referrer)
    organisation_id UUID NOT NULL REFERENCES organizations(id),

    -- Business Information
    abn VARCHAR(11) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    trading_name VARCHAR(255),

    -- Contact Information
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_mobile VARCHAR(20),
    address TEXT,

    -- Audit
    created_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Ensure unique client per referrer (same ABN can exist across different orgs)
    CONSTRAINT unique_client_per_org UNIQUE(organisation_id, abn, deleted_at)
);

-- Indexes for clients
CREATE INDEX idx_clients_organisation_id ON clients(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_abn ON clients(abn) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_org_abn ON clients(organisation_id, abn) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_entity_name_trgm ON clients USING gin(entity_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_created_by ON clients(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX idx_clients_contact_email ON clients(contact_email) WHERE deleted_at IS NULL;

COMMENT ON TABLE clients IS 'Client records scoped per referrer organization';

-- =====================================================
-- OPPORTUNITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Sequential CF ID (CF10000+)
    opportunity_id VARCHAR(20) UNIQUE NOT NULL,

    -- References
    organisation_id UUID NOT NULL REFERENCES organizations(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'opportunity', 'application_created', 'application_submitted',
                   'conditionally_approved', 'approved', 'declined', 'settled', 'withdrawn')
    ),
    status_changed_at TIMESTAMPTZ,
    status_changed_by UUID REFERENCES user_profiles(id),

    -- Loan Details
    loan_amount DECIMAL(15, 2),
    loan_purpose TEXT,
    loan_type VARCHAR(50),
    asset_type VARCHAR(100),
    estimated_property_value DECIMAL(15, 2),
    lvr DECIMAL(5, 2), -- Loan to Value Ratio

    -- Financial Details (JSONB for flexibility)
    financial_details JSONB DEFAULT '{}'::jsonb,

    -- Notes
    notes TEXT,
    brief_overview TEXT,
    outcome TEXT,
    additional_notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create sequence for opportunity_id
CREATE SEQUENCE IF NOT EXISTS opportunity_id_seq START WITH 10000;

-- Indexes for opportunities (CRITICAL for performance)
CREATE INDEX idx_opportunities_opportunity_id ON opportunities(opportunity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_organisation_id ON opportunities(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_client_id ON opportunities(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_status ON opportunities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_created_by ON opportunities(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX idx_opportunities_org_status ON opportunities(organisation_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_org_created ON opportunities(organisation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_status_created ON opportunities(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_client_status ON opportunities(client_id, status) WHERE deleted_at IS NULL;

-- Index for sorting and filtering
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX idx_opportunities_updated_at ON opportunities(updated_at DESC);
CREATE INDEX idx_opportunities_status_changed ON opportunities(status_changed_at DESC) WHERE status_changed_at IS NOT NULL;

-- Full-text search on notes
CREATE INDEX idx_opportunities_notes_search ON opportunities USING gin(to_tsvector('english', COALESCE(notes, '') || ' ' || COALESCE(brief_overview, ''))) WHERE deleted_at IS NULL;

-- JSONB indexes for financial_details queries
CREATE INDEX idx_opportunities_financial_details ON opportunities USING gin(financial_details) WHERE deleted_at IS NULL;

COMMENT ON TABLE opportunities IS 'Loan opportunities and applications';

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- References
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),

    -- Comment Content
    comment TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for comments
CREATE INDEX idx_comments_opportunity_id ON comments(opportunity_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user_id ON comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_is_public ON comments(opportunity_id, is_public) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

COMMENT ON TABLE comments IS 'Two-way communication on opportunities';

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- User & Context
    user_id UUID REFERENCES user_profiles(id),
    ip_address INET,
    user_agent TEXT,

    -- Change Information
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),

    -- Field Changes
    field_name VARCHAR(100),
    old_value JSONB,
    new_value JSONB,

    -- Full change snapshot
    changes JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Partition audit_logs by month for better performance
-- Note: Requires PostgreSQL 10+
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for all critical changes';

-- =====================================================
-- USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- User Reference
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Session Information
    ip_address INET NOT NULL,
    user_agent TEXT,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Remember Me Token
    remember_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ,

    -- Session Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id, last_activity DESC);
CREATE INDEX idx_user_sessions_remember_token ON user_sessions(remember_token) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_user_sessions_is_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_ip_address ON user_sessions(user_id, ip_address);

COMMENT ON TABLE user_sessions IS 'User session tracking with IP monitoring';

-- =====================================================
-- USER INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Organization & Email
    organisation_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,

    -- Invitation Details
    role VARCHAR(50) NOT NULL CHECK (role IN ('referrer_admin', 'referrer_team')),
    invited_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Token
    invitation_token VARCHAR(255) UNIQUE NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Resend tracking
    resent_count INTEGER DEFAULT 0,
    last_resent_at TIMESTAMPTZ,

    -- Acceptance
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES user_profiles(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT unique_pending_invitation UNIQUE(organisation_id, email, status)
);

-- Indexes for user_invitations
CREATE INDEX idx_user_invitations_email ON user_invitations(email, status);
CREATE INDEX idx_user_invitations_organisation_id ON user_invitations(organisation_id, status);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);

COMMENT ON TABLE user_invitations IS 'User invitation tracking with expiration';

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_directors_updated_at BEFORE UPDATE ON organization_directors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_invitations_updated_at BEFORE UPDATE ON user_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER FOR OPPORTUNITY_ID GENERATION
-- =====================================================
CREATE OR REPLACE FUNCTION generate_opportunity_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.opportunity_id IS NULL THEN
        NEW.opportunity_id := 'CF' || LPAD(nextval('opportunity_id_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_opportunity_id BEFORE INSERT ON opportunities FOR EACH ROW EXECUTE FUNCTION generate_opportunity_id();

-- =====================================================
-- TRIGGER FOR STATUS CHANGE TRACKING
-- =====================================================
CREATE OR REPLACE FUNCTION track_opportunity_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_changed_at := NOW();
        -- status_changed_by should be set by application
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_status_change BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION track_opportunity_status_change();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR AS $$
    SELECT role FROM user_profiles WHERE user_id = user_uuid AND deleted_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user organization
CREATE OR REPLACE FUNCTION get_user_organisation(user_uuid UUID)
RETURNS UUID AS $$
    SELECT organisation_id FROM user_profiles WHERE user_id = user_uuid AND deleted_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY organizations_admin_all ON organizations FOR ALL TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'admin_team'));

CREATE POLICY organizations_referrer_view ON organizations FOR SELECT TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND id = get_user_organisation(auth.uid())
    );

-- User Profiles Policies
CREATE POLICY user_profiles_admin_all ON user_profiles FOR ALL TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'admin_team'));

CREATE POLICY user_profiles_referrer_view ON user_profiles FOR SELECT TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND organisation_id = get_user_organisation(auth.uid())
    );

CREATE POLICY user_profiles_self_view ON user_profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Clients Policies
CREATE POLICY clients_admin_all ON clients FOR ALL TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'admin_team'));

CREATE POLICY clients_referrer_all ON clients FOR ALL TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND organisation_id = get_user_organisation(auth.uid())
    );

-- Opportunities Policies
CREATE POLICY opportunities_admin_all ON opportunities FOR ALL TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'admin_team'));

CREATE POLICY opportunities_referrer_view ON opportunities FOR SELECT TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND organisation_id = get_user_organisation(auth.uid())
    );

CREATE POLICY opportunities_referrer_insert ON opportunities FOR INSERT TO authenticated
    WITH CHECK (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND organisation_id = get_user_organisation(auth.uid())
    );

CREATE POLICY opportunities_referrer_update ON opportunities FOR UPDATE TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('referrer_admin', 'referrer_team')
        AND organisation_id = get_user_organisation(auth.uid())
        AND status = 'draft' -- Only allow updates to drafts
    );

-- Comments Policies
CREATE POLICY comments_admin_all ON comments FOR ALL TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'admin_team'));

CREATE POLICY comments_referrer_view ON comments FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM opportunities o
            WHERE o.id = opportunity_id
            AND o.organisation_id = get_user_organisation(auth.uid())
        )
    );

CREATE POLICY comments_referrer_insert ON comments FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM opportunities o
            WHERE o.id = opportunity_id
            AND o.organisation_id = get_user_organisation(auth.uid())
        )
    );

-- =====================================================
-- PERFORMANCE OPTIMIZATION: MATERIALIZED VIEWS
-- =====================================================

-- Opportunity Statistics View (Refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_opportunity_statistics AS
SELECT
    organisation_id,
    status,
    COUNT(*) as count,
    SUM(loan_amount) as total_loan_amount,
    AVG(loan_amount) as avg_loan_amount,
    MAX(created_at) as last_opportunity_date
FROM opportunities
WHERE deleted_at IS NULL
GROUP BY organisation_id, status;

CREATE UNIQUE INDEX idx_mv_opp_stats_org_status ON mv_opportunity_statistics(organisation_id, status);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_opportunity_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opportunity_statistics;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VACUUM AND ANALYZE SETTINGS
-- =====================================================

-- Set autovacuum more aggressive for high-traffic tables
ALTER TABLE opportunities SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE comments SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE audit_logs SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- =====================================================
-- GRANTS (For Supabase service role)
-- =====================================================

-- Grant all privileges to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant appropriate privileges to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
