# Legacy PHP to Supabase Field Mappings

## Data Migration Overview

### Migration Tool
- **Admin Page**: `/admin/migration` — Web-based UI for running migrations
- **API Endpoint**: `POST /api/admin/migration` with `{ step: string }`
- **Schema Mapping**: `migration/SCHEMA_MAPPING.md` — Field-by-field mapping documentation

### Migration Order (Critical)
1. Organisations → 2. Users → 3. Directors → 4. Clients → 5. Opportunities → 6. Opportunity Details → 7. Comments → 8. Pre-Assessment Contacts → 9. Global Settings

### Key Migration Notes
- **Passwords cannot be migrated** — Different hashing algorithms, users must reset
- **ID Mapping** — Old integer IDs mapped to new UUIDs via JSON files in `/migration/mappings/`
- **Safe to re-run** — Existing records are skipped (checks for duplicates)
- **Role Mapping**: Old role 1→`super_admin`, 2→`admin_team`, 3(no admin_id)→`referrer_admin`, 3(with admin_id)→`referrer_team`
- **Re-migration script**: `migration/scripts/10-fix-missing-fields.ts` — fixes lender, loan_purpose=13, status 7/10/15/20
- **SQL fix generator**: `migration/scripts/generate-fix-sql.ts` — reads SQL dump + ID mappings, outputs SQL for Supabase SQL Editor

## PHP Integer → Snake_Case Mappings

### Entity Type (clients.entity, opportunities.entity_type, organisations.entity_type)
| PHP ID | Value |
|--------|-------|
| 1 | private_company |
| 2 | sole_trader |
| 3 | smsf_trust |
| 4 | trust |
| 5 | partnership |
| 6 | individual |

### Opportunity/Client Industry (opportunities.industry, clients.industry) — 14 values
| PHP ID | Value |
|--------|-------|
| 1 | arts_and_lifestyle |
| 2 | building_and_trade |
| 3 | financial_services_and_insurance |
| 4 | hair_and_beauty |
| 5 | health |
| 6 | hospitality |
| 7 | manufacturing |
| 8 | agriculture_farming_and_mining |
| 9 | real_estate_and_property_management |
| 10 | services |
| 11 | professional_services |
| 12 | retail |
| 13 | transport_and_automotive |
| 14 | wholesaling |

### Organisation Industry Type (organisations.industry_type) — DIFFERENT from opportunity industry!
| PHP ID | Value |
|--------|-------|
| 1 | accountant |
| 2 | buyers_advocate |
| 3 | conveyancer |
| 4 | financial_adviser |
| 5 | lawyer |
| 6 | mortgage_broker |
| 7 | real_estate_agent |
| 8 | other |

### Loan Type (opportunities.loan_type)
| PHP ID | Value |
|--------|-------|
| 1 | construction |
| 2 | lease_doc |
| 3 | low_doc |
| 4 | private_short_term |
| 5 | unsure |

### Loan Purpose (opportunities.loan_purpose) — PHP uses ODD IDs only
| PHP ID | Value |
|--------|-------|
| 1 | purchase_owner_occupier |
| 3 | refinance |
| 5 | land_bank |
| 7 | commercial_equipment |
| 9 | purchase_investment |
| 11 | purchase_owner_occupier |
| 13 | equity_release |

### Asset Type (opportunities.asset_type)
| PHP ID | Value |
|--------|-------|
| 1 | commercial_property |
| 2 | residential_property |
| 3 | vacant_land |

### Lender (opportunities.lender) — 40 integer IDs mapped to text strings
- 1→Adelaide Bank, 2→AMP, 3→ANZ, ... 23→NAB, ... 33→Westpac, 40→Other
- Full mapping in `migration/scripts/utils.ts` → `mapLender()`

### Application Status (opportunities.status) — multi-field logic
- 1→opportunity, 2→application_created, 3→application_submitted, 4→approved (or conditionally_approved if decision=4), 5→settled (if date_settled) or application_completed, 6→opportunity (Referred), 7→conditionally_approved, 10/15→declined, 20→withdrawn
