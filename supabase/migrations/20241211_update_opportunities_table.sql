-- Update opportunities table to include all fields from the Add Opportunity form

-- Add missing columns to opportunities table
ALTER TABLE opportunities 
  -- Contact Details
  ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_mobile TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  
  -- Business Details
  ADD COLUMN IF NOT EXISTS abn TEXT,
  ADD COLUMN IF NOT EXISTS entity_name TEXT,
  ADD COLUMN IF NOT EXISTS time_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  
  -- Asset Details
  ADD COLUMN IF NOT EXISTS asset_address TEXT,
  ADD COLUMN IF NOT EXISTS property_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS loan_type TEXT,
  
  -- Terms Acceptance (storing as JSONB for flexibility)
  ADD COLUMN IF NOT EXISTS terms_accepted JSONB DEFAULT '{}';

-- Update the loan_purpose column to handle the new format
ALTER TABLE opportunities 
  ALTER COLUMN loan_purpose TYPE TEXT;

-- Add check constraint for entity_type
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS check_entity_type,
  ADD CONSTRAINT check_entity_type CHECK (
    entity_type IS NULL OR entity_type IN (
      'private_company', 
      'sole_trader', 
      'smsf_trust', 
      'trust', 
      'partnership', 
      'individual'
    )
  );

-- Add check constraint for asset_type (update existing)
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS check_asset_type,
  ADD CONSTRAINT check_asset_type CHECK (
    asset_type IS NULL OR asset_type IN (
      'commercial_property',
      'residential_property', 
      'vacant_land'
    )
  );

-- Add check constraint for loan_type
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS check_loan_type,
  ADD CONSTRAINT check_loan_type CHECK (
    loan_type IS NULL OR loan_type IN (
      'construction',
      'lease_doc',
      'low_doc',
      'private_short_term',
      'unsure'
    )
  );

-- Add check constraint for loan_purpose
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS check_loan_purpose,
  ADD CONSTRAINT check_loan_purpose CHECK (
    loan_purpose IS NULL OR loan_purpose IN (
      'purchase_owner_occupier',
      'purchase_investment',
      'refinance',
      'equity_release',
      'land_bank',
      'business_use',
      'commercial_equipment'
    )
  );

-- Add check constraint for industry
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS check_industry,
  ADD CONSTRAINT check_industry CHECK (
    industry IS NULL OR industry IN (
      'arts_and_lifestyle',
      'building_and_trade',
      'financial_services_and_insurance',
      'hair_and_beauty',
      'health',
      'hospitality',
      'manufacturing',
      'agriculture_farming_and_mining',
      'real_estate_and_property_management',
      'services',
      'professional_services',
      'retail',
      'transport_and_automotive',
      'wholesaling'
    )
  );

-- Create index for ABN searches in opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_abn ON opportunities(abn);

-- Create index for email searches in opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_email ON opportunities(contact_email);

-- Add comment to explain the terms_accepted field structure
COMMENT ON COLUMN opportunities.terms_accepted IS 'JSON object storing terms acceptance: {infoTrue: boolean, clientConsent: boolean, referralFee: boolean, serviceFee: boolean}';