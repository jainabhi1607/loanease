-- Create user_invitations table for tracking invited users
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  resent_count INTEGER DEFAULT 0,
  last_resent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique email per organisation for pending invites
  CONSTRAINT unique_pending_invite UNIQUE (organisation_id, email, status)
);

-- Add index for faster lookups
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_organisation_email ON user_invitations(organisation_id, email);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins and admin team can see all invitations
CREATE POLICY "Admin users can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Referrer admins can see invitations for their organisation
CREATE POLICY "Referrer admins can view their organisation invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organisation_id = user_invitations.organisation_id
      AND users.role = 'referrer_admin'
    )
  );

-- Super admins and admin team can create invitations for any organisation
CREATE POLICY "Admin users can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Referrer admins can create invitations for their organisation
CREATE POLICY "Referrer admins can create invitations for their organisation" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organisation_id = user_invitations.organisation_id
      AND users.role = 'referrer_admin'
    )
  );

-- Allow updates for resending and accepting invitations
CREATE POLICY "Admin users can update invitations" ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

CREATE POLICY "Referrer admins can update their organisation invitations" ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organisation_id = user_invitations.organisation_id
      AND users.role = 'referrer_admin'
    )
  );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run the expiration function (if using pg_cron)
-- SELECT cron.schedule('expire-invitations', '0 * * * *', 'SELECT expire_old_invitations();');