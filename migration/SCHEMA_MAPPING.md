# CakePHP to Supabase Migration - Schema Mapping

## Overview

This document maps the old CakePHP MySQL database to the new Supabase PostgreSQL schema.

---

## 1. Users & Organisations

### Old Schema: `users` + `user_details`
In the old system, the `users` table contains both user and organisation data combined.

**Old Role Mapping:**
- `role = 1` → Admin (super_admin or admin_team)
- `role = 2` → Admin Team
- `role = 3` → Referrer Admin (has company_name, abn - this is an organisation owner)
- `role = 4` → Referrer Team (belongs to a referrer admin via admin_id)
- `role = 7` → Team Member (sub-user)
- `role = 9` → Client

**Key Insight:** Users with `role = 3` and `admin_id = NULL` are organisation owners. Their `company_name`, `abn` fields become the `organisations` table.

### New Schema Mapping:

#### `organisations` table (from users where role=3 and admin_id is NULL)
| Old Field (users) | New Field (organisations) |
|-------------------|---------------------------|
| company_name | name |
| abn | abn |
| acn | - (not used) |
| (from user_details.address) | address |
| phone | phone |
| email | - |
| industry_type | industry |
| trading_name | trading_name |
| state | state |
| status = 1 | is_active = true |
| (from user_details.ip_address) | agreement_ip |
| (from user_details.date_time) | agreement_date |
| (from user_details.custom_commission_split) | → organisation_details.commission_split |

#### `users` table (Supabase auth.users + users table)
| Old Field (users) | New Field (users) |
|-------------------|-------------------|
| id | old_id (for reference) |
| - | id (new UUID) |
| email | email (auth.users) |
| name | first_name |
| last_name | last_name |
| phone | phone |
| role (mapped) | role |
| admin_id → lookup org | organisation_id |
| status = 1 | is_active = true |

**Role Mapping:**
| Old Role | New Role |
|----------|----------|
| 1 (with admin@cluefinance.com.au) | super_admin |
| 1, 2 | admin_team |
| 3 | referrer_admin |
| 4, 7 | referrer_team |
| 9 | client |

---

## 2. Directors

### Old: `directors`
| Old Field | New Field (organisation_directors) |
|-----------|-----------------------------------|
| id | - |
| user_id | organisation_id (lookup via user → org) |
| name | first_name |
| last_name | last_name |

---

## 3. Clients

### Old: `clients` + `client_details`
| Old Field (clients) | New Field (clients) |
|---------------------|---------------------|
| id | old_id (for reference) |
| user_id → lookup org | organisation_id |
| entity | entity_type (INTEGER 1-6) |
| entity_name | entity_name |
| first_name | contact_first_name |
| last_name | contact_last_name |
| mobile | contact_phone |
| email | contact_email |
| abn | abn |
| time_in_business | - (stored on opportunities) |
| industry | industry |
| (from client_details.address) | address |
| user_id | created_by (mapped to new user id) |

**Entity Type Mapping (already integers):**
- 1 = Private company
- 2 = Sole trader
- 3 = SMSF Trust
- 4 = Trust
- 5 = Partnership
- 6 = Individual

---

## 4. Applications → Opportunities

### Old: `applications`
| Old Field | New Field (opportunities) |
|-----------|---------------------------|
| id | old_id |
| application_id (CF10000) | opportunity_id |
| client_id | client_id (mapped) |
| referrer_group → lookup | organization_id |
| user_id | created_by (mapped) |
| loan_type | loan_type |
| type_of_asset | asset_type |
| loan_amount | loan_amount |
| estimated_property_value | estimated_property_value |
| loan_purpose | loan_purpose |
| deal_id | external_ref |
| target_settlement_date | target_settlement_date |
| date_settled | date_settled |
| application_status | status (mapped) |
| status (1=active, 20=settled, 10=unqualified, 2=draft) | - |
| date_time | created_at |

**Status Mapping:**
| Old application_status | New status |
|-----------------------|------------|
| 1 | draft |
| 2 | opportunity |
| 3 | draft |
| 4 | application_created |
| 5 | application_submitted |
| 6 | conditionally_approved |
| 7 | approved |
| 10 | declined |
| 15 | withdrawn |
| 20 | settled |

**Loan Type Mapping (old → new):**
- 1 = commercial_term_loan
- 2 = commercial_loc
- 3 = smsf_loan
- 4 = equipment_finance
- 5 = development_finance

**Asset Type Mapping (old → new):**
- 1 = commercial_property
- 2 = residential_property
- 3 = vacant_land

**Loan Purpose Mapping (old → new):**
- 1 = purchase
- 3 = refinance
- 5 = equity_release
- 7 = construction
- 9 = development
- 11 = business_acquisition
- 13 = working_capital

---

## 5. Application Details → Opportunity Details

### Old: `application_details`
| Old Field | New Field (opportunity_details) |
|-----------|--------------------------------|
| application_id | opportunity_id (mapped to new UUID) |
| address | address |
| street_address | street_address |
| city | city |
| state | state |
| postcode | postcode |
| net_profit | net_profit |
| ammortisation | ammortisation |
| deprecition | deprecition |
| existing_interest_costs | existing_interest_costs |
| rental_expense | rental_expense |
| proposed_rental_income | proposed_rental_income |
| existing_liabilities | existing_liabilities |
| additional_property | additional_property |
| smsf_structure | smsf_structure |
| ato_liabilities | ato_liabilities |
| credit_file_issues | credit_file_issues |
| reason_declined | reason_declined |
| disqualify_reason | disqualify_reason / unqualified_reason |
| ip_address | ip_address |
| loan_acc_ref_no | loan_acc_ref_no |
| flex_id | flex_id |
| payment_received_date | payment_received_date |
| payment_amount | payment_amount |
| overview | brief_overview |
| term1, term2, term3, term4 | term1, term2, term3, term4 |

---

## 6. Application Comments → Comments

### Old: `application_comments`
| Old Field | New Field (comments) |
|-----------|---------------------|
| id | - |
| application_id | opportunity_id (mapped) |
| comments | comment |
| user_id | user_id (mapped) |
| date_time | created_at |
| - | is_public (default true) |

---

## 7. Contact Details → Pre-Assessment Contacts

### Old: `contact_details`
| Old Field | New Field (pre_assessment_contacts) |
|-----------|-------------------------------------|
| first_name | first_name |
| last_name | last_name |
| email | email |
| phone | phone |
| date_time | created_at |
| ip_address | ip_address |

---

## 8. Global Settings

### Old: `global_settings`
| Old Field | New Field (global_settings) |
|-----------|----------------------------|
| new_signup_email_subject | new_signup_email_subject |
| new_signup_email_content | new_signup_email_content |
| terms_conditions | terms_and_conditions |
| interest_rate | default_interest_rate |
| broker_retailer_information | commission_split |
| referrer_fee_content | referrer_fees |
| new_broker_alert | new_broker_alert |
| new_broker_email_subject | new_broker_email_subject |
| new_broker_email_content | new_broker_email_content |
| referrer_agreement_subject | referrer_agreement_subject |
| referrer_agreement_content | referrer_agreement_content |
| new_user_subject | new_user_subject |
| new_user_content | new_user_content |

---

## ID Mapping Strategy

Since old IDs are integers and new IDs are UUIDs, we need to:

1. Create mapping tables during migration:
   - `_migration_users` (old_id INT, new_id UUID)
   - `_migration_organisations` (old_user_id INT, new_id UUID)
   - `_migration_clients` (old_id INT, new_id UUID)
   - `_migration_opportunities` (old_id INT, new_id UUID)

2. Use these mappings when migrating related tables

3. Drop mapping tables after migration is complete

---

## Migration Order

1. **organisations** - From users where role=3 and admin_id IS NULL
2. **organisation_directors** - From directors
3. **organisation_details** - From user_details (custom_commission_split)
4. **users** - All users (create in Supabase Auth + users table)
5. **clients** - Map to new organisation_id and created_by
6. **opportunities** - Map to new organisation_id, client_id, created_by
7. **opportunity_details** - Map to new opportunity_id
8. **comments** - Map to new opportunity_id and user_id
9. **pre_assessment_contacts** - From contact_details
10. **global_settings** - Direct mapping

---

## Notes

- Passwords cannot be migrated (different hashing). Users will need to reset passwords.
- All dates need timezone consideration (old MySQL → new PostgreSQL with timezone)
- Old `status` field in applications has multiple meanings - need careful mapping
- `referrer_group` in applications points to the referrer admin user, need to map to organisation
