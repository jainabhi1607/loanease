-- Migration: Add unqualified columns to opportunity_details
-- Created: 2024-12-14
-- Purpose: Add columns for tracking unqualified opportunities (currently stored in notes JSON)

-- Step 1: Add new columns to opportunity_details table
ALTER TABLE opportunity_details
  ADD COLUMN IF NOT EXISTS is_unqualified INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unqualified_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unqualified_reason TEXT DEFAULT NULL;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN opportunity_details.is_unqualified IS '1 = Yes (unqualified), 0 = No, NULL = Not specified. Marks opportunity as unqualified/disqualified.';
COMMENT ON COLUMN opportunity_details.unqualified_date IS 'Timestamp when the opportunity was marked as unqualified';
COMMENT ON COLUMN opportunity_details.unqualified_reason IS 'Reason why the opportunity was marked as unqualified';

-- Step 3: Create indexes for querying unqualified opportunities
CREATE INDEX IF NOT EXISTS idx_opportunity_details_is_unqualified
  ON opportunity_details(is_unqualified)
  WHERE is_unqualified = 1;

CREATE INDEX IF NOT EXISTS idx_opportunity_details_unqualified_date
  ON opportunity_details(unqualified_date);

-- Step 4: Migrate existing data from opportunities.notes JSON to new columns
-- This extracts is_unqualified, unqualified_date, and unqualified_reason from notes JSON
UPDATE opportunity_details od
SET
  is_unqualified = CASE
    WHEN (SELECT notes::jsonb->>'is_unqualified' FROM opportunities WHERE id = od.opportunity_id) = 'true' THEN 1
    ELSE NULL
  END,
  unqualified_date = CASE
    WHEN (SELECT notes::jsonb->>'unqualified_date' FROM opportunities WHERE id = od.opportunity_id) IS NOT NULL
    THEN (SELECT (notes::jsonb->>'unqualified_date')::TIMESTAMP WITH TIME ZONE FROM opportunities WHERE id = od.opportunity_id)
    ELSE NULL
  END,
  unqualified_reason = (SELECT notes::jsonb->>'unqualified_reason' FROM opportunities WHERE id = od.opportunity_id)
WHERE EXISTS (
  SELECT 1 FROM opportunities o
  WHERE o.id = od.opportunity_id
  AND o.notes IS NOT NULL
  AND o.notes::text ~ '^\s*\{'
  AND o.notes::jsonb ? 'is_unqualified'
);

-- Step 5: Add check constraint (optional - ensures only 0, 1, or NULL)
ALTER TABLE opportunity_details
  ADD CONSTRAINT check_is_unqualified CHECK (is_unqualified IN (0, 1, NULL));

-- Verification query to show migrated data
SELECT
  'Data Migration Summary' as check_name,
  COUNT(*) as total_unqualified,
  MIN(unqualified_date) as earliest_date,
  MAX(unqualified_date) as latest_date
FROM opportunity_details
WHERE is_unqualified = 1;

-- Show sample of migrated records
SELECT
  od.opportunity_id,
  od.is_unqualified,
  od.unqualified_date,
  LEFT(od.unqualified_reason, 50) as reason_preview
FROM opportunity_details od
WHERE od.is_unqualified = 1
LIMIT 5;
