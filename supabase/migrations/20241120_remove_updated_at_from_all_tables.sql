-- Remove updated_at column from all tables that have it

-- Drop all update triggers first
DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
DROP TRIGGER IF EXISTS update_opportunity_details_updated_at ON opportunity_details;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS update_client_details_updated_at ON client_details;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_organization_directors_updated_at ON organization_directors;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS update_opportunities_updated_at();
DROP FUNCTION IF EXISTS update_opportunity_details_updated_at();
DROP FUNCTION IF EXISTS update_clients_updated_at();
DROP FUNCTION IF EXISTS update_client_details_updated_at();
DROP FUNCTION IF EXISTS update_organizations_updated_at();
DROP FUNCTION IF EXISTS update_organization_directors_updated_at();
DROP FUNCTION IF EXISTS update_users_updated_at();
DROP FUNCTION IF EXISTS update_user_profiles_updated_at();
DROP FUNCTION IF EXISTS update_comments_updated_at();
DROP FUNCTION IF EXISTS update_user_sessions_updated_at();
DROP FUNCTION IF EXISTS update_user_invitations_updated_at();

-- Remove updated_at columns from all tables
ALTER TABLE opportunities DROP COLUMN IF EXISTS updated_at;
ALTER TABLE opportunity_details DROP COLUMN IF EXISTS updated_at;
ALTER TABLE clients DROP COLUMN IF EXISTS updated_at;
ALTER TABLE client_details DROP COLUMN IF EXISTS updated_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS updated_at;
ALTER TABLE organization_directors DROP COLUMN IF EXISTS updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS updated_at;
ALTER TABLE comments DROP COLUMN IF EXISTS updated_at;
ALTER TABLE user_sessions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS updated_at;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS updated_at;
ALTER TABLE pre_assessment_contacts DROP COLUMN IF EXISTS updated_at;

-- Note: created_at columns are kept as they are useful for tracking when records were created
