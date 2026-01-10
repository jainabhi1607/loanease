-- Migration: Add RLS policies for referrer users on opportunity_details table
-- Created: 2025-01-18
-- Purpose: Allow referrer users to view opportunity_details for their organization's opportunities

-- Enable RLS on opportunity_details table (if not already enabled)
ALTER TABLE opportunity_details ENABLE ROW LEVEL SECURITY;

-- Add policy for referrers to view their organization's opportunity details
CREATE POLICY "Referrers can view their organization's opportunity details"
  ON opportunity_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN opportunities opp ON opp.id = opportunity_details.opportunity_id
      WHERE u.id = auth.uid()
      AND u.role IN ('referrer_admin', 'referrer_team')
      AND u.organisation_id = opp.organization_id
      AND opp.deleted_at IS NULL
    )
  );

-- Add policy for referrers to insert opportunity details for their organization
CREATE POLICY "Referrers can insert opportunity details for their organization"
  ON opportunity_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN opportunities opp ON opp.id = opportunity_details.opportunity_id
      WHERE u.id = auth.uid()
      AND u.role IN ('referrer_admin', 'referrer_team')
      AND u.organisation_id = opp.organization_id
    )
  );

-- Add policy for referrers to update their organization's opportunity details
CREATE POLICY "Referrers can update their organization's opportunity details"
  ON opportunity_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN opportunities opp ON opp.id = opportunity_details.opportunity_id
      WHERE u.id = auth.uid()
      AND u.role IN ('referrer_admin', 'referrer_team')
      AND u.organisation_id = opp.organization_id
      AND opp.deleted_at IS NULL
    )
  );

-- Note: Referrers should NOT be able to delete opportunity details
-- Only admins can delete (existing policy already covers this)
