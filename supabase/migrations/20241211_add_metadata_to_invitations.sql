-- Add metadata column to user_invitations for storing additional information
ALTER TABLE user_invitations 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment explaining the metadata field
COMMENT ON COLUMN user_invitations.metadata IS 'Additional data for the invitation (e.g., role, names, admin flags)';

-- Allow null organisation_id for system admin invitations
ALTER TABLE user_invitations 
ALTER COLUMN organisation_id DROP NOT NULL;