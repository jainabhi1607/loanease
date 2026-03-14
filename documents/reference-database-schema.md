# Database Schema Reference

## Main Tables

1. **users** - Users with roles: super_admin, admin_team, referrer_admin, referrer_team, client
2. **organisations** - Referrer companies (ABN, commission structure, is_active, agreement_ip, agreement_date, suburb, state, postcode)
3. **organisation_directors** - Company directors
4. **organisation_details** - Extended org data (commission_split for custom referrer commission)
5. **clients** - Client records (scoped per referrer, entity type as INTEGER 1-6, has industry field)
6. **client_details** - Extended client data (address, street_address, city, state, postcode)
7. **opportunities** - Core opportunity data (status, external_ref, icr, lvr, entity_type, industry, time_in_business, loan_type, terms_accepted, property_value, asset_address)
8. **opportunity_details** - Extended data (client_address, financials, booleans, terms, payment info, is_unqualified, time_in_business, brief_overview, deal_finalisation_status)
9. **comments** - Opportunity notes (fields: id, opportunity_id, user_id, comment, is_public, created_at)
10. **audit_logs** - All critical changes tracked
11. **global_settings** - App-wide configs (terms_and_conditions, referrer_fees, commission_split, default_interest_rate, email templates)
12. **email_verification_tokens** - Email verification tokens for signup (includes signup_data jsonb)
13. **pre_assessment_contacts** - Pre-assessment submissions
14. **login_history** - Login attempts (user_id nullable for failed attempts, email, status: success/failed/blocked, ip_address, failure_reason, location)
15. **login_attempts** - Rate limiting (email, ip_address, success, locked_until)
16. **two_fa_codes** - 2FA OTP codes (user_id, code, expires_at, used)

## Key Relationships

- `opportunities.client_id → clients.id`
- `opportunities.organization_id → organisations.id`
- `opportunity_details.opportunity_id → opportunities.id` (one-to-one, FK is UUID)
- `client_details.client_id → clients.id` (one-to-one)
- `organisation_details.organisation_id → organisations.id` (one-to-one)
- `comments.opportunity_id → opportunities.id`
- **NO FK between opportunities and users** (must join manually in code)
- **NO FK between comments and users** (must fetch user details separately)
- **NO views** - Always query tables directly and join in code
- **opportunity_id field conflict**: `opportunities.opportunity_id` is TEXT (CF10020), `opportunity_details.opportunity_id` is UUID (FK). When spreading details into opportunity object, exclude details.opportunity_id to preserve the CF10020 value
- **Supabase returns `opportunity_details` as ARRAY** (not object) because FK lacks UNIQUE constraint. Always use `Array.isArray()` check:
  ```typescript
  const details = Array.isArray(opp.opportunity_details) ? opp.opportunity_details[0] : opp.opportunity_details;
  ```

## Important Constraints

- **Entity types** (STRING): private_company, sole_trader, smsf_trust, trust, partnership, individual — must include ALL 6 in every dropdown and formatEntityType function
- **Loan purpose**: SINGLE value only (not comma-separated)
- **Asset type**: ONLY 3 values: commercial_property, residential_property, vacant_land
- **Column naming**: `clients.organisation_id` vs `opportunities.organization_id` (inconsistent spelling!)
- **is_unqualified**: INTEGER in opportunity_details (1 = unqualified, 0 or NULL = not unqualified)
- **time_in_business**: TEXT type (e.g., "4 Years"), stored on both `opportunities` and `opportunity_details` tables
- **Yes/No fields**: Database may store inconsistent casing (Yes/yes/YES) — always use `.toLowerCase()` when comparing rental_income, existing_liabilities, additional_security, smsf_structure, ato_liabilities, credit_issues
