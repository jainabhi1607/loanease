-- Migration: Split opportunities table into opportunities and opportunity_details
-- Created: 2024-12-14
-- Purpose: Separate core opportunity data from detailed/extended fields

-- Step 1: Create opportunity_details table with all detailed fields
CREATE TABLE IF NOT EXISTS opportunity_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Address fields
  address VARCHAR(255),
  street_address VARCHAR(255),
  city VARCHAR(100),
  state INTEGER,
  postcode VARCHAR(50),

  -- Financial details
  net_profit FLOAT,
  ammortisation FLOAT,
  deprecition FLOAT,
  existing_interest_costs FLOAT,
  rental_expense FLOAT,
  proposed_rental_income FLOAT,

  -- Boolean/Yes-No fields (using INTEGER as specified)
  existing_liabilities INTEGER,
  additional_property INTEGER,
  smsf_structure INTEGER,
  ato_liabilities INTEGER,
  credit_file_issues INTEGER,

  -- Terms acceptance fields
  term1 INTEGER,
  term2 INTEGER,
  term3 INTEGER,
  term4 INTEGER,

  -- Additional text fields
  reason_declined VARCHAR(255),
  disqualify_reason TEXT,

  -- Client information fields
  client_address TEXT,
  time_in_business VARCHAR(100),
  brief_overview TEXT,

  -- Additional outcome and notes fields
  outcome_level VARCHAR(50),
  additional_notes TEXT,
  rental_income VARCHAR(10),

  -- Payment and reference fields
  loan_acc_ref_no VARCHAR(200),
  flex_id VARCHAR(200),
  payment_received_date DATE,
  payment_amount FLOAT,

  -- Tracking fields
  ip_address VARCHAR(60),

  CONSTRAINT fk_opportunity
    FOREIGN KEY(opportunity_id)
    REFERENCES opportunities(id)
    ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_opportunity_details_opportunity_id ON opportunity_details(opportunity_id);
CREATE INDEX idx_opportunity_details_loan_acc_ref_no ON opportunity_details(loan_acc_ref_no);
CREATE INDEX idx_opportunity_details_flex_id ON opportunity_details(flex_id);
CREATE INDEX idx_opportunity_details_state ON opportunity_details(state);
CREATE INDEX idx_opportunity_details_postcode ON opportunity_details(postcode);

-- Step 3: Add auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_opportunity_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opportunity_details_timestamp
  BEFORE UPDATE ON opportunity_details
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_details_updated_at();

-- Step 4: Migrate existing data from opportunities.notes JSON to opportunity_details
-- This will extract fields from the notes JSON field and populate the new table
-- Handles invalid JSON gracefully by checking if notes is valid JSON first
INSERT INTO opportunity_details (
  opportunity_id,
  net_profit,
  ammortisation,
  deprecition,
  existing_interest_costs,
  rental_expense,
  proposed_rental_income,
  existing_liabilities,
  additional_property,
  smsf_structure,
  ato_liabilities,
  credit_file_issues,
  client_address,
  time_in_business,
  brief_overview,
  outcome_level,
  additional_notes,
  rental_income,
  address
)
SELECT
  id as opportunity_id,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'net_profit') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'amortisation') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'depreciation') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'existing_interest') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'rental_expense') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CAST((notes::jsonb->>'proposed_rental_income') AS FLOAT)
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CASE
      WHEN (notes::jsonb->>'existing_liabilities') = 'Yes' THEN 1
      WHEN (notes::jsonb->>'existing_liabilities') = 'No' THEN 0
      ELSE NULL
    END
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CASE
      WHEN (notes::jsonb->>'additional_property') = 'Yes' THEN 1
      WHEN (notes::jsonb->>'additional_property') = 'No' THEN 0
      ELSE NULL
    END
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CASE
      WHEN (notes::jsonb->>'smsf_structure') = 'Yes' THEN 1
      WHEN (notes::jsonb->>'smsf_structure') = 'No' THEN 0
      ELSE NULL
    END
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CASE
      WHEN (notes::jsonb->>'ato_liabilities') = 'Yes' THEN 1
      WHEN (notes::jsonb->>'ato_liabilities') = 'No' THEN 0
      ELSE NULL
    END
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN CASE
      WHEN (notes::jsonb->>'credit_file_issues') = 'Yes' THEN 1
      WHEN (notes::jsonb->>'credit_file_issues') = 'No' THEN 0
      ELSE NULL
    END
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN notes::jsonb->>'client_address'
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN notes::jsonb->>'time_in_business'
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN notes::jsonb->>'brief_overview'
    ELSE NULL
  END,
  CASE
    WHEN notes IS NOT NULL AND notes != '' AND notes::text ~ '^\s*\{'
    THEN notes::jsonb->>'asset_address'
    ELSE NULL
  END
FROM opportunities
WHERE deleted_at IS NULL
ON CONFLICT (opportunity_id) DO NOTHING;

-- Step 5: Add comment for documentation
COMMENT ON TABLE opportunity_details IS 'Extended details for opportunities including financial data, addresses, and additional metadata. Linked to opportunities table via opportunity_id.';
COMMENT ON COLUMN opportunity_details.opportunity_id IS 'Foreign key reference to opportunities.id';
COMMENT ON COLUMN opportunity_details.term1 IS 'Terms and conditions acceptance flag 1';
COMMENT ON COLUMN opportunity_details.term2 IS 'Terms and conditions acceptance flag 2';
COMMENT ON COLUMN opportunity_details.term3 IS 'Terms and conditions acceptance flag 3';
COMMENT ON COLUMN opportunity_details.term4 IS 'Terms and conditions acceptance flag 4';
COMMENT ON COLUMN opportunity_details.existing_liabilities IS '1 = Yes, 0 = No, NULL = Not specified';
COMMENT ON COLUMN opportunity_details.additional_property IS '1 = Yes, 0 = No, NULL = Not specified';
COMMENT ON COLUMN opportunity_details.smsf_structure IS '1 = Yes, 0 = No, NULL = Not specified';
COMMENT ON COLUMN opportunity_details.ato_liabilities IS '1 = Yes, 0 = No, NULL = Not specified';
COMMENT ON COLUMN opportunity_details.credit_file_issues IS '1 = Yes, 0 = No, NULL = Not specified';

-- Step 6: Enable Row Level Security
ALTER TABLE opportunity_details ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (matching opportunities table policies)
-- Policy for super_admin and admin_team: See all
CREATE POLICY "Admin can view all opportunity details"
  ON opportunity_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin_team')
    )
  );

-- Policy for referrers: See only their organization's opportunity details
CREATE POLICY "Referrers can view their org opportunity details"
  ON opportunity_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      INNER JOIN user_profiles up ON up.organization_id = o.organization_id
      WHERE o.id = opportunity_details.opportunity_id
      AND up.user_id = auth.uid()
      AND up.role IN ('referrer_admin', 'referrer_team')
    )
  );

-- Policy for admin insert/update
CREATE POLICY "Admin can insert opportunity details"
  ON opportunity_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin_team')
    )
  );

CREATE POLICY "Admin can update opportunity details"
  ON opportunity_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin_team')
    )
  );

CREATE POLICY "Admin can delete opportunity details"
  ON opportunity_details
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin_team')
    )
  );

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON opportunity_details TO authenticated;
GRANT SELECT ON opportunity_details TO anon;

-- Step 9: Drop the view if it exists (not used - queries join tables directly)
DROP VIEW IF EXISTS opportunities_with_details;
