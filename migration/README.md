# CakePHP to Supabase Migration

This folder contains scripts and data for migrating from the old CakePHP MySQL database to the new Supabase PostgreSQL database.

## Prerequisites

1. Ensure you have the `.env.local` file with valid Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

2. Install required dependencies:
   ```bash
   npm install dotenv
   ```

## Folder Structure

```
migration/
├── README.md                    # This file
├── SCHEMA_MAPPING.md           # Detailed schema mapping documentation
├── loanease_staging_db_table_*.sql # SQL export files from legacy MySQL
├── scripts/                     # Migration scripts
│   ├── migrate-organisations.ts
│   ├── migrate-users.ts
│   ├── migrate-directors.ts
│   ├── migrate-clients.ts
│   ├── migrate-opportunities.ts
│   ├── migrate-opportunity-details.ts
│   ├── migrate-comments.ts
│   ├── migrate-pre-assessment-contacts.ts
│   ├── migrate-global-settings.ts
│   └── run-all-migrations.ts    # Main runner script
└── id_mappings/                 # Generated ID mapping files (old → new)
    ├── organisations.json
    ├── users.json
    ├── clients.json
    └── opportunities.json
```

## Migration Order

The scripts must be run in this order due to foreign key dependencies:

1. **Organisations** - Extract from old users table (role=3, admin_id=NULL)
2. **Users** - Create Supabase Auth users + users table entries
3. **Directors** - Organisation directors
4. **Clients** - Client records (requires organisations + users)
5. **Opportunities** - From applications table (requires clients + users + organisations)
6. **Opportunity Details** - Extended opportunity data (requires opportunities)
7. **Comments** - Application comments (requires opportunities + users)
8. **Pre-Assessment Contacts** - From contact_details table
9. **Global Settings** - App configuration

## Running Migrations

### Option 1: Run All Migrations (Recommended)

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/run-all-migrations.ts
```

### Option 2: Run Individual Migrations

Run each script individually in order:

```bash
# 1. Organisations
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-organisations.ts

# 2. Users
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-users.ts

# 3. Directors
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-directors.ts

# 4. Clients
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-clients.ts

# 5. Opportunities
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-opportunities.ts

# 6. Opportunity Details
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-opportunity-details.ts

# 7. Comments
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-comments.ts

# 8. Pre-Assessment Contacts
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-pre-assessment-contacts.ts

# 9. Global Settings
npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-global-settings.ts
```

## Important Notes

### Passwords
- **Passwords cannot be migrated** - CakePHP uses different password hashing than Supabase Auth
- All migrated users will need to use the **password reset** functionality to set new passwords
- Users are created with random temporary passwords

### ID Mappings
- Each migration creates/uses JSON mapping files in `id_mappings/`
- These map old MySQL integer IDs to new Supabase UUIDs
- Do not delete these files until migration is complete and verified

### Idempotent Scripts
- Scripts check for existing records before inserting
- Safe to re-run if a migration fails partway through
- Existing records will be skipped

### Data Validation
After migration, verify:
1. Organisation count matches
2. User count matches (only active users migrated)
3. Client count matches
4. Opportunity count matches
5. All relationships are correctly linked

## Schema Mapping Reference

See `SCHEMA_MAPPING.md` for detailed field-by-field mapping between old and new schemas.

### Key Differences

| Old (CakePHP) | New (Supabase) |
|---------------|----------------|
| `users` table with role/company | Separate `users` + `organisations` tables |
| Integer IDs | UUID IDs |
| `applications` | `opportunities` |
| `application_details` | `opportunity_details` |
| `application_comments` | `comments` |
| `contact_details` | `pre_assessment_contacts` |
| `directors` | `organisation_directors` |

### Role Mapping

| Old Role | New Role |
|----------|----------|
| 1 (Admin) | `super_admin` or `admin_team` |
| 2 (Admin Team) | `admin_team` |
| 3 (Referrer Admin) | `referrer_admin` |
| 4 (Referrer Team) | `referrer_team` |
| 7 (Team Member) | `referrer_team` |
| 9 (Client) | `client` |

## Troubleshooting

### "Organisation mappings not found"
Run `migrate-organisations.ts` first - other scripts depend on it.

### "User mappings not found"
Run `migrate-users.ts` before client/opportunity migrations.

### Duplicate key errors
Record already exists - this is normal for re-runs. The script will skip it.

### Connection errors
Check `.env.local` for correct Supabase credentials.

## Post-Migration Tasks

1. **Notify users** to reset their passwords
2. **Verify data** in Supabase dashboard
3. **Test** login and core functionality
4. **Update** any environment-specific settings
5. **Archive** or delete old database after verification period
