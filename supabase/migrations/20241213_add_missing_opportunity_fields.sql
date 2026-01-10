-- Add missing fields to opportunities table

-- Add external_ref column for storing external reference numbers
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

-- Add icr (Interest Coverage Ratio) column
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);

-- Add comment to explain fields
COMMENT ON COLUMN opportunities.external_ref IS 'External reference number for this opportunity (e.g., from external system)';
COMMENT ON COLUMN opportunities.icr IS 'Interest Coverage Ratio - calculated financial metric';

-- Create index for external_ref searches
CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref ON opportunities(external_ref);
