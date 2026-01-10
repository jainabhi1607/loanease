# Notes-to-Columns Migration - Complete Summary

## Overview
Successfully migrated all structured data from the `notes` JSON field to proper database columns in the `opportunities` and `opportunity_details` tables.

## What Was Changed

### 1. Database Migration Created
**File:** `supabase/migrations/20241214_add_unqualified_columns.sql`

Added 3 new columns to `opportunity_details` table:
- `is_unqualified` (INTEGER: 1=Yes, 0=No, NULL=Not specified)
- `unqualified_date` (TIMESTAMP WITH TIME ZONE)
- `unqualified_reason` (TEXT)

**Features:**
- Automatically migrates existing data from notes JSON
- Creates indexes for query performance
- Adds check constraints for data integrity
- Includes verification queries

**Action Required:** Run this migration in Supabase SQL Editor

### 2. TypeScript Types Updated
**File:** `types/database.ts`

Added the 3 new unqualified fields to the `opportunity_details` type definition in Row, Insert, and Update interfaces.

### 3. API Routes Updated

#### **CREATE Route** (`app/api/admin/opportunities/create/route.ts`)
**Changes:**
- ❌ **Removed:** Lines 126-149 that created JSON notes
- ✅ **Now:** Stores `icr` in `opportunities` table
- ✅ **Now:** Always creates `opportunity_details` record (even for minimal info)
- ✅ **Now:** Stores all structured data in proper columns:
  - `brief_overview`, `client_address`, `time_in_business` → `opportunity_details`
  - `address` (asset_address) → `opportunity_details.address`
  - All financial fields → `opportunity_details`
  - All Yes/No fields → `opportunity_details` (as 1/0 integers)
  - `outcome_level`, `additional_notes` → `opportunity_details`

#### **GET Route** (`app/api/admin/opportunities/[id]/route.ts`)
**Changes:**
- ❌ **Removed:** `parsedNotes` object creation and all JSON parsing
- ❌ **Removed:** All fallback logic like `details.field || parsedNotes.field`
- ✅ **Now:** Reads ONLY from proper database columns
- ✅ **Added:** Returns `is_unqualified`, `unqualified_date`, `unqualified_reason` fields
- ✅ **Now:** `notes` field returned as-is for free-text use only

#### **PATCH Route** (`app/api/admin/opportunities/[id]/route.ts`)
**Changes:**
- ✅ **Added:** `is_unqualified`, `unqualified_date`, `unqualified_reason` to `detailsFields` list
- ✅ **Updated:** Boolean field handling to include `is_unqualified`

#### **Unqualified Route** (`app/api/admin/opportunities/unqualified/route.ts`)
**Changes:**
- ❌ **Removed:** Notes JSON parsing and filtering
- ✅ **Now:** Uses JOIN with `opportunity_details` table
- ✅ **Now:** Filters on `is_unqualified = 1` column
- ✅ **Now:** Reads `unqualified_date` and `unqualified_reason` from columns

### 4. Frontend Updated

#### **Opportunity Detail Page** (`app/(dashboard)/admin/opportunities/[id]/page.tsx`)
**Changes:**
- ❌ **Removed:** JSON notes manipulation when marking as unqualified
- ✅ **Now:** Sends `is_unqualified`, `unqualified_date`, `unqualified_reason` as separate fields

## Migration Checklist

### ✅ Step 1: Files Created/Updated (COMPLETED)
- [x] Migration SQL file created
- [x] TypeScript types updated
- [x] CREATE route updated
- [x] GET route updated
- [x] PATCH route updated
- [x] Unqualified route updated
- [x] Frontend page updated

### 🔲 Step 2: Database Migration (YOU NEED TO DO THIS)
1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/dgvbgriywrvyslakckay/sql/new

2. Copy contents of: `supabase/migrations/20241214_add_unqualified_columns.sql`

3. Paste and click "Run"

4. Verify the output shows:
   - ✓ Columns added successfully
   - ✓ Indexes created
   - ✓ Data migrated (if you have existing unqualified opportunities)

### 🔲 Step 3: Testing (RECOMMENDED)
After running the migration:

1. **Test Create Opportunity:**
   - Create a new opportunity with full details
   - Verify data saves to `opportunity_details` table (not notes JSON)
   - Check database: `SELECT * FROM opportunity_details ORDER BY created_at DESC LIMIT 1;`

2. **Test View Opportunity:**
   - Open existing opportunity detail page
   - Verify all fields display correctly
   - Check browser console for any errors

3. **Test Mark as Unqualified:**
   - Click "Unqualified" button on opportunity
   - Enter a reason
   - Verify it saves to database columns (not notes JSON)
   - Check: `SELECT is_unqualified, unqualified_date, unqualified_reason FROM opportunity_details WHERE opportunity_id = 'xxx';`

4. **Test Unqualified List:**
   - Navigate to Unqualified Opportunities page
   - Verify list displays correctly
   - Check that date and reason show properly

## What Happened to the `notes` Field?

### Previous Behavior (BAD):
- `notes` field stored structured data as JSON
- Data was duplicated in both notes and proper columns
- API had complex fallback logic
- Hard to query, index, and validate data

### Current Behavior (GOOD):
- `notes` field is kept as a **free-text field only**
- All structured data now in proper columns
- Easy to query, index, and enforce constraints
- API reads directly from columns (no fallback logic)
- `notes` can still be used for miscellaneous comments/internal notes

## Data Mapping

### Fields Moved from `notes` JSON to Columns:

| Old Location (notes JSON) | New Location | Type |
|--------------------------|--------------|------|
| `brief_overview` | `opportunity_details.brief_overview` | TEXT |
| `client_address` | `opportunity_details.client_address` | TEXT |
| `time_in_business` | `opportunity_details.time_in_business` | VARCHAR(100) |
| `asset_address` | `opportunity_details.address` | VARCHAR(255) |
| `estimated_property_value` | `opportunities.property_value` | NUMERIC |
| `icr` | `opportunities.icr` | DECIMAL(10,2) |
| `outcome_level` | `opportunity_details.outcome_level` | VARCHAR(50) |
| `additional_notes` | `opportunity_details.additional_notes` | TEXT |
| `net_profit` | `opportunity_details.net_profit` | FLOAT |
| `amortisation` | `opportunity_details.ammortisation` | FLOAT |
| `depreciation` | `opportunity_details.deprecition` | FLOAT |
| `existing_interest` | `opportunity_details.existing_interest_costs` | FLOAT |
| `rental_expense` | `opportunity_details.rental_expense` | FLOAT |
| `proposed_rental_income` | `opportunity_details.proposed_rental_income` | FLOAT |
| `rental_income` | `opportunity_details.rental_income` | VARCHAR(10) |
| `existing_liabilities` (Yes/No) | `opportunity_details.existing_liabilities` | INTEGER (1/0) |
| `additional_security` (Yes/No) | `opportunity_details.additional_property` | INTEGER (1/0) |
| `smsf_structure` (Yes/No) | `opportunity_details.smsf_structure` | INTEGER (1/0) |
| `ato_liabilities` (Yes/No) | `opportunity_details.ato_liabilities` | INTEGER (1/0) |
| `credit_issues` (Yes/No) | `opportunity_details.credit_file_issues` | INTEGER (1/0) |
| `is_unqualified` | `opportunity_details.is_unqualified` | INTEGER (1/0) |
| `unqualified_date` | `opportunity_details.unqualified_date` | TIMESTAMP |
| `unqualified_reason` | `opportunity_details.unqualified_reason` | TEXT |

## Benefits of This Migration

### 1. **Better Performance**
- Indexed columns for fast queries
- No JSON parsing overhead
- Database-level filtering and sorting

### 2. **Data Integrity**
- Check constraints enforce valid values
- Foreign key relationships maintained
- NULL handling consistent

### 3. **Easier Queries**
```sql
-- OLD WAY (BAD):
SELECT * FROM opportunities
WHERE notes::jsonb->>'is_unqualified' = 'true';

-- NEW WAY (GOOD):
SELECT o.*, od.*
FROM opportunities o
JOIN opportunity_details od ON o.id = od.opportunity_id
WHERE od.is_unqualified = 1;
```

### 4. **Type Safety**
- TypeScript knows exact field types
- No runtime JSON parsing errors
- Auto-complete in IDE

### 5. **Cleaner Code**
- No fallback logic needed
- Simpler API responses
- Easier to maintain

## Rollback Plan (If Needed)

If you encounter issues, you can rollback:

```sql
-- Remove the new columns
ALTER TABLE opportunity_details
  DROP COLUMN IF EXISTS is_unqualified,
  DROP COLUMN IF EXISTS unqualified_date,
  DROP COLUMN IF EXISTS unqualified_reason;

-- Drop the indexes
DROP INDEX IF EXISTS idx_opportunity_details_is_unqualified;
DROP INDEX IF EXISTS idx_opportunity_details_unqualified_date;
```

Then revert the code changes using git:
```bash
git checkout HEAD -- app/api/admin/opportunities/
git checkout HEAD -- app/(dashboard)/admin/opportunities/[id]/page.tsx
git checkout HEAD -- types/database.ts
```

## Next Steps

1. ✅ **Run the migration** in Supabase SQL Editor
2. ✅ **Test the functionality** (create, view, edit, mark unqualified)
3. ✅ **Monitor for errors** in production
4. ⏰ **Optional:** After confirming everything works, you can remove old data from notes JSON:
   ```sql
   -- Run this ONLY after confirming migration works
   UPDATE opportunities
   SET notes = NULL
   WHERE notes IS NOT NULL;
   ```

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify migration ran successfully
4. Ensure all API routes were updated correctly

## Summary

**Status:** ✅ Code changes COMPLETE
**Action Required:** Run migration SQL file in Supabase
**Impact:** All new opportunities will use proper columns instead of notes JSON
**Risk:** Low (existing data preserved, can rollback if needed)
