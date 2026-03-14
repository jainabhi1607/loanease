# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Loanease** is a commercial loan referral management platform that connects loan referrers (accountants, lawyers, finance companies) with Loanease to manage loan opportunities for their clients. Built with Next.js, React, Supabase, and hosted on Vercel.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **UI Components**: Shadcn/ui (use out-of-the-box styling initially)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with 2FA via email
- **Email**: Postmark (template-based transactional emails)
- **File Storage**: Supabase Storage
- **Hosting**: Vercel (staging + production)
- **External APIs**: Australian Business Register (ABN lookup)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Project Structure

```
/app                    # Next.js app router
  /api                  # API routes
    /admin              # Admin API endpoints
      /users            # User management API (NEW)
        /[id]
          /update       # Update user (password, role) endpoint (NEW)
      /referrers        # Referrer management API
        /[id]           # Individual referrer operations
          /update       # Update referrer endpoint
          /stats        # Referrer statistics endpoint
          /users        # Get referrer organization users
        /create         # Create referrer endpoint
        /invite         # Invite user to referrer endpoint
      /opportunities    # Opportunity management API
        /[id]           # Individual opportunity operations (GET, PATCH)
        /create         # Create opportunity endpoint
        /unqualified    # List unqualified opportunities
        /route.ts       # List all opportunities endpoint (with status filtering)
      /potential-referrers  # Potential referrers management API (NEW - November 2024)
        /[id]           # Delete potential referrer contact
        /export/csv     # Export contacts to CSV
        /route.ts       # List all pre-assessment contacts
      /settings         # Settings management API (NEW - November 2024)
        /route.ts       # GET/POST global settings
      /clients          # Client management API (COMPLETED - November 2024)
        /all            # List all clients endpoint with export
        /[id]           # Individual client operations (GET)
          /update       # Update client endpoint (PATCH)
        /export         # Export clients to CSV
    /referrer           # Referrer API endpoints (NEW - November 2024)
      /dashboard        # Referrer dashboard statistics and recent opportunities
      /opportunities    # Referrer opportunities API (filtered by organization)
        /[id]           # Individual opportunity details (read-only for referrers)
        /create         # Create opportunity endpoint (NEW - January 2025)
        /route.ts       # List opportunities (with status filtering)
      /clients          # Referrer clients API (filtered by organization)
      /users            # Referrer users API (team members in same organization)
      /account          # Referrer account management API (NEW - November 2024)
        /route.ts       # GET account data (organization, users, directors)
        /add-user       # POST create new user in organization
        /update-user/[id] # PATCH update user details and password
        /delete-user/[id] # DELETE remove user from organization
        /update-organization # PATCH update organization details
      /login-history    # Referrer login history API (filtered by current user)
    /auth               # Authentication endpoints
      /login            # Login endpoint
      /logout           # Logout endpoint
      /reset-password   # Password reset endpoints (NEW)
        /request        # Request password reset email (NEW)
        /confirm        # Confirm password reset with token (NEW)
    /pre-assessment     # Pre-assessment tool API (NEW - November 2024)
      /contact          # Save contact info from pre-assessment submissions
  /(auth)              # Authentication pages
    /login             # Login page
    /reset-password    # Password reset request page (NEW)
      /confirm         # Password reset confirmation page (NEW)
  /pre-assessment      # Public pre-assessment tool (NEW - November 2024)
    /page.tsx          # Pre-assessment form with conditional fields
    /results           # Assessment results page
      /page.tsx        # Display ICR, LVR, and outcome with CTA
  /(dashboard)         # Protected dashboard routes
    /admin             # Loanease admin portal
      /referrers        # Referrer CRUD pages
        /[id]           # View referrer details
          /edit         # Edit referrer page
        /page.tsx       # List all referrers
      /opportunities    # Opportunity management pages (status="opportunity" only)
        /[id]           # View opportunity details
          /page.tsx     # Opportunity detail page with edit dialogs
        /add            # Add new opportunity page
        /unqualified    # Unqualified opportunities list (NEW)
        /page.tsx       # List all opportunities (filtered)
      /applications     # Application management pages (status>=application_created) (NEW)
        /page.tsx       # List all applications (filtered)
      /clients         # Client management pages (COMPLETED - November 2024)
        /[id]          # View client details
          /page.tsx    # Client detail page with opportunities and edit dialog
        /page.tsx      # List all clients
      /potential-referrers  # Potential referrers management (NEW - November 2024)
        /page.tsx      # List pre-assessment contacts with CSV export and delete
      /dashboard       # Admin dashboard
      /settings        # Admin settings (NEW - November 2024)
        /page.tsx      # Settings landing page with 3 card options
        /general       # General settings page
          /page.tsx    # Opportunity alerts, referrer alerts, loan declined, interest rate, commission split
        /terms         # Terms & Conditions page
          /page.tsx    # Terms editor and referrer fees
        /login-history # Login history page
          /page.tsx    # Placeholder for login history tracking
    /referrer          # Referrer portal (COMPLETED - January 2025)
      /dashboard       # Referrer dashboard with statistics and recent opportunities
      /opportunities   # Referrer opportunities pages
        /[id]          # View opportunity details (read-only, uses shared components)
        /add           # Add opportunity page (COMPLETED - January 2025)
        /page.tsx      # List opportunities (status="opportunity" only)
      /applications    # Referrer applications page
        /page.tsx      # List applications (status>=application_created)
      /team            # Team management page
        /page.tsx      # View organization team members
      /layout.tsx      # Referrer layout with navigation menu
    /client            # Future client portal
/components            # UI components (shadcn/ui)
  /ui                  # Base UI components (button, dialog, input, etc.)
    /sortable-table-head.tsx  # Reusable sortable table header component (NEW - November 2024)
  /opportunity         # Shared opportunity components (NEW - January 2025)
    /OpportunityClientDetails.tsx     # Client details section (shared)
    /OpportunityLoanDetails.tsx       # Loan details section (shared)
    /OpportunityFinancialDetails.tsx  # Financial details section (shared)
    /OpportunitySidebar.tsx           # Sidebar with dates & progress (shared)
  /ClientFundingRequirements.tsx  # Reusable funding form component (NEW - November 2024)
  /OtherQuestions.tsx              # Reusable questions form component (NEW - November 2024)
  /AddReferrerDialog.tsx
  /InviteUserDialog.tsx
  /EditUserDialog.tsx  # Edit user password/role dialog (NEW)
  /EditClientDialog.tsx # Edit client details dialog (NEW - November 2024)
  /address-autocomplete
  /COMPONENT_USAGE_GUIDE.md        # Complete usage guide for reusable components (NEW - November 2024)
  /COMPONENT_REFACTORING_COMPLETE.md  # Refactoring summary (NEW - November 2024)
/lib                   # Utility functions
  /supabase            # Supabase client and queries
    /server.ts         # Server-side Supabase client
    /service.ts        # Service role Supabase client (elevated permissions)
  /auth                # Authentication helpers
  /email               # Postmark integration
  /utils.ts            # Common utilities (cn, formatters, etc.)
  /opportunity-utils.ts # Shared opportunity formatting utilities (NEW - January 2025)
/types                 # TypeScript type definitions
  /database.ts         # Database schema types
/hooks                 # Custom React hooks
  /use-toast.ts        # Toast notification hook
/scripts               # Development and maintenance scripts
  /create-super-admin.js
  /check-valid-orgs.js
  /check-opportunities-schema.js
  /test-all-loan-purposes.js
/database              # Database optimization and scripts
  /migrations          # SQL migration files
  /scripts             # Maintenance and analysis scripts
  README.md            # Database documentation
  DATABASE_OPTIMIZATION.md
  QUICK_REFERENCE.md
/middleware.ts         # Next.js middleware for auth
/CLAUDE.md            # This file - project documentation
```

## Database Schema

### Core Tables

1. **user_profiles** (Supabase Auth + custom profile)
   - id, user_id, email, first_name, last_name, role, organisation_id
   - Roles: super_admin, admin_team, referrer_admin, referrer_team, client
   - Security: 2FA enabled, last login tracking

2. **organizations**
   - Referrer companies with ABN, company details
   - commission_structure (JSONB for flexible data)
   - is_active status flag

3. **organization_directors**
   - Company directors and key contacts
   - Multiple directors per organization
   - Primary contact designation

4. **clients**
   - Scoped per referrer (separate records even if same ABN)
   - ABN as business identifier
   - Key columns: `entity` (INTEGER 1-6), `entity_name`, `contact_first_name`, `contact_last_name`, `contact_phone`, `contact_email`, `abn`, `time_in_business`, `industry`, `address`, `state`
   - **Entity types** (stored as INTEGER):
     - 1: Private company
     - 2: Sole trader
     - 3: SMSF Trust
     - 4: Trust
     - 5: Partnership
     - 6: Individual
   - Unique constraint: organisation_id + ABN

4b. **client_details** (extended client address data)
   - One-to-one relationship with clients via `client_id` FK
   - Address breakdown: `address`, `street_address`, `city`, `state` (INTEGER), `postcode`
   - Cascade delete: removing client also removes details
   - Unique constraint: client_id (one detail record per client)
   - Migration: `scripts/create-client-details-table.sql`

5. **opportunities** (includes applications)
   - Sequential ID: CF10000+ (auto-generated)
   - status: draft, opportunity, application_created, application_submitted, conditionally_approved, approved, declined, settled, withdrawn
   - Foreign keys: client_id, organisation_id, created_by, assigned_to
   - Key columns: `external_ref` (TEXT), `icr` (DECIMAL), `lvr` (DECIMAL)
   - Financial details stored in JSONB `notes` field for flexibility (net_profit, amortisation, depreciation, etc.)
   - Auto-tracked: status_changed_at, created_at
   - **IMPORTANT**: `external_ref` and `icr` columns must exist in database - add with migration if missing
   - **NEW**: Extended details moved to separate `opportunity_details` table (see below)

5b. **opportunity_details** (extended opportunity data)
   - One-to-one relationship with opportunities via `opportunity_id` FK
   - **Address fields**: address, street_address, city, state (INTEGER), postcode
   - **Financial details**: net_profit, ammortisation, deprecition, existing_interest_costs, rental_expense, proposed_rental_income
   - **Boolean fields** (stored as INTEGER: 1=Yes, 0=No): existing_liabilities, additional_property, smsf_structure, ato_liabilities, credit_file_issues
   - **Terms acceptance**: term1, term2, term3, term4 (INTEGER: 1=accepted, 0=not)
   - **Additional fields**: reason_declined, additional_comments, disqualify_reason
   - **Payment/Reference**: loan_acc_ref_no, flex_id, payment_received_date, payment_amount
   - **Tracking**: ip_address
   - Cascade delete: removing opportunity also removes details
   - View available: `opportunities_with_details` (joins both tables)
   - Migration: `supabase/migrations/20241214_split_opportunities_table.sql`

6. **comments**
   - Two-way communication on opportunities
   - is_public: boolean for visibility control

7. **audit_logs**
   - Track all critical changes
   - user_id, table_name, record_id, action, changes (JSONB)
   - IP address and user agent tracking

8. **user_sessions**
   - Track IPs, devices, remember_me tokens
   - Session expiration and revocation
   - Last activity tracking

9. **user_invitations**
   - Email-based invitation system
   - Status tracking: pending, accepted, expired, revoked
   - Resend count and expiration dates

10. **pre_assessment_contacts** (NEW - November 2024)
   - Stores contact information from pre-assessment tool submissions
   - Basic contact fields only: first_name, last_name, email, phone
   - No financial data stored (calculations are ephemeral)
   - RLS: Only super_admin and admin_team can view
   - Created at tracking with created_at timestamp
   - Migration: `supabase/migrations/20241120_create_pre_assessment_contacts.sql`

11. **global_settings** (NEW - November 2024)
   - Stores all application-wide settings and configurations
   - Key-value structure with flexible setting types
   - Columns: id, setting_key (unique), setting_value (TEXT), setting_type (text/textarea/number/json), description, created_at
   - Setting types:
     - `text`: Short text values
     - `textarea`: Long text content (terms, commission split, etc.)
     - `number`: Numeric values (interest rate)
     - `json`: Arrays and objects (loan declined reasons)
   - RLS: Only super_admin and admin_team can view/update/insert
   - Default settings:
     - opportunity_alert_emails (textarea)
     - new_referrer_alert_emails (textarea)
     - loan_declined_reasons (json array)
     - default_interest_rate (number)
     - commission_split (textarea)
     - terms_and_conditions (textarea)
     - referrer_fees (textarea)
   - Upsert pattern: Updates existing or inserts new settings
   - Audit logging: All changes tracked in audit_logs table
   - Migration: `supabase/migrations/20241120_create_global_settings_table.sql`

### Database Schema Notes

**IMPORTANT - Column Naming Inconsistency:**
- `clients` table uses: `organisation_id` (British spelling)
- `opportunities` table uses: `organization_id` (American spelling)
- TypeScript types may not match actual database schema
- Always verify column names directly in database before using

**Database Constraints:**
- `loan_purpose` field accepts ONLY ONE value, not comma-separated lists
- Valid `loan_purpose` values: `purchase_owner_occupier`, `purchase_investment`, `refinance`, `equity_release`, `land_bank`, `business_use`, `commercial_equipment`
- `entity_type` field has check constraint accepting: `private_company`, `public_company`, `sole_trader`, `partnership`, `trust`, `individual`
- `asset_type` valid values (RESTRICTED TO 3): `commercial_property`, `residential_property`, `vacant_land`
- `loan_type` valid values: `construction`, `lease_doc`, `low_doc`, `private_short_term`, `unsure`
- `industry` valid values (14 options): `arts_and_lifestyle`, `building_and_trade`, `financial_services_and_insurance`, `hair_and_beauty`, `health`, `hospitality`, `manufacturing`, `agriculture_farming_and_mining`, `real_estate_and_property_management`, `services`, `professional_services`, `retail`, `transport_and_automotive`, `wholesaling`
- Use underscores, not hyphens in values (e.g., `purchase_owner_occupier` not `purchase-owner-occupier`)
- All enum-like fields use snake_case in database but should be formatted for display (e.g., "Private Company" instead of "private_company")

**Foreign Key Relationships:**
- **No FK relationship exists between `opportunities` and `users` tables**
- Cannot use Supabase auto-joins for `opportunities.created_by → users`
- Must fetch users separately and manually join in application code
- Related FK constraints that DO exist:
  - `opportunities.client_id → clients.id`
  - `opportunities.organization_id → organisations.id`
- When fetching opportunities with user data:
  1. Fetch opportunities with `created_by` field
  2. Extract unique user IDs
  3. Fetch users separately with `.in('id', userIds)`
  4. Create lookup map and join in code

### Database Optimization (Production-Ready)

- **50+ Strategic Indexes**: Single-column, composite, partial, and GIN indexes
- **Performance Features**:
  - Materialized views for complex aggregations
  - Trigram indexes for fuzzy text search (company names, clients)
  - Full-text search on opportunity notes
  - JSONB indexes for flexible queries
  - Partial indexes (exclude soft-deleted records)
- **Automatic Triggers**:
  - Auto-generate opportunity IDs (CF10000+)
  - Track status changes automatically
  - Note: `updated_at` fields removed from all tables (November 2024)
- **Expected Performance** (with 100,000+ records):
  - Fetch opportunities by org: < 50ms
  - Search clients by ABN: < 10ms
  - Full-text search: < 100ms
  - Complex aggregations: < 200ms (via materialized views)
- **Maintenance**: Daily/weekly/monthly scripts in `/database/scripts/`
- **Documentation**: Complete optimization guide in `/database/DATABASE_OPTIMIZATION.md`

### Security Implementation

- **Row Level Security (RLS)**: Enforce data isolation at database level
- **Policies**:
  - Referrers see only their organization's data
  - Clients (future) see only their opportunities across all referrers
  - Loanease (super_admin, admin_team) sees all data
- **Soft deletes**: Use `deleted_at` timestamp, never hard delete
- **Audit Trail**: All changes logged with user, IP, and timestamp

## Key Features & Workflows

### 1. Authentication Flow
- Email/password login
- 2FA for Loanease (mandatory) and Referrers (optional)
- 30-day "remember me" functionality
- IP monitoring (track last 3 IPs, notify on new IP)
- Session management with "sign out all devices"
- **Password Reset** (NEW - December 2024):
  - Self-service password reset via email
  - "Forgot password?" link on login page
  - Request page: `/reset-password` (enter email)
  - Confirmation page: `/reset-password/confirm?token=...`
  - Email sent via Postmark with 1-hour expiration link
  - Token-based verification via Supabase Auth recovery flow
  - Security: Prevents email enumeration (always shows success)
  - Audit logging for reset requests and completions
  - API endpoints:
    - POST `/api/auth/reset-password/request` - Send reset email
    - POST `/api/auth/reset-password/confirm` - Verify token and reset password

### 2. Pre-Assessment Tool (NEW - November 2024)
Public-facing loan pre-assessment calculator for potential referrers to evaluate loan opportunities.

**Features:**
- **No authentication required** - publicly accessible
- **Contact Information** section:
  - First Name, Last Name (required)
  - Email (required, with real-time validation)
  - Phone (optional)
  - Shows warning if email already exists with link to login
- **Your Client's Funding Requirements** section with conditional fields:
  - Loan Amount (required)
  - Estimated Property Value (required)
  - "Will the property be funded solely from rental income?" (Yes/No)
    - If Yes: Shows only Proposed Rental Income field
    - If No: Shows all financial fields (Net Profit, Amortisation, Depreciation, Existing Interest Costs, Rental Expense, Proposed Rental Income)
- **Other Questions** section (5 Yes/No questions):
  - Existing liabilities?
  - Additional property security?
  - SMSF structure?
  - Existing/overdue ATO liabilities?
  - Credit file issues?
- **Automatic Calculations**:
  - LVR (Loan to Value Ratio): (Loan Amount / Property Value) × 100
  - ICR (Interest Coverage Ratio): Total Income Servicing / Total Interest (using 8.5% default rate)
- **Outcome Assessment**:
  - Green: Deal looks good (ICR ≥ 2, LVR ≤ 65)
  - Yellow: Needs confirmation (ICR ≥ 2, LVR 65-80)
  - Red: Requires further assessment (ICR < 1.5)
- **Results Page** (`/pre-assessment/results`):
  - Displays ICR and LVR
  - Shows color-coded outcome with messaging
  - Call-to-action: "Become a Loanease Referral Partner"
  - Link to registration page
- **Data Storage**:
  - Saves only basic contact info (first_name, last_name, email, phone) to `pre_assessment_contacts` table
  - Financial calculations are ephemeral (not stored)
  - RLS: Only admins can view submissions
- **Email Validation**:
  - Debounced check (500ms)
  - Uses existing `/api/auth/check-email` endpoint
  - Disables submit button if email exists

**URL**: `/pre-assessment`
**API Endpoint**: POST `/api/pre-assessment/contact`

### 3. Referrer Management (Super Admin)
- **View All Referrers**: List all referrer organizations with search and filtering
- **Add New Referrer**: Create new referrer organizations with:
  - Company details (name, ABN, contact info)
  - Commission structure override (optional)
  - Address information
  - Status (active/inactive)
- **Edit Referrer**: Update existing referrer details including:
  - Company information
  - Commission structures
  - Contact details
  - Organization status
- **View Referrer Details**: Comprehensive view showing:
  - Organization information
  - Associated users and team members
  - **Real-time Statistics** (NEW - December 2024):
    - Open Opportunities count
    - Opportunities Value (total loan amount)
    - Open Applications count
    - Settled Applications count
    - Total Settled Value
    - Conversion Ratio (settled/total %)
  - **Opportunities / Applications Tab** (NEW - December 2024):
    - Filterable table showing all opportunities for this referrer
    - Excludes unqualified opportunities
    - Click-through to opportunity details
  - Recent activity
- **User Invitation System**: Invite team members to referrer organizations
  - Send email invitations
  - Track invitation status (pending, accepted, expired)
  - Resend invitations
  - Manage team members
- **User Management** (NEW - December 2024):
  - **Edit User**: Update user details from referrer detail page
    - Change user password (admin can reset any user's password)
    - Change user role (Admin / Team Member)
    - Account owner role is protected (cannot be changed)
    - Edit icon appears in Actions column of Users table
    - Audit logging for all user updates
    - API: `/api/admin/users/[id]/update`

### 3. Opportunity Management
- **Add Opportunity**: Multi-step form for creating loan opportunities
  - Select referrer and referrer user
  - Choose new or existing client
  - **Enter client details (for new clients)**:
    - First Name & Last Name (required)
    - Mobile & Email (required)
    - Entity (Borrowing Entity Type) - Dropdown with values: `private_company`, `public_company`, `sole_trader`, `partnership`, `trust`, `individual`
    - Entity Name
    - ABN
    - Company Address
    - Time in Business (e.g., "4 Years")
    - Industry - Dropdown with 14 specific categories (Arts and Lifestyle, Building and Trade, Financial Services and Insurance, Hair and Beauty, Health, Hospitality, Manufacturing, Agriculture/Farming/Mining, Real Estate, Services, Professional Services, Retail, Transport/Automotive, Wholesaling)
    - Brief Overview (required)
  - **Optional detailed loan information**:
    - **Loan Details**:
      - Type of Asset - Dropdown (ONLY 3 options): `commercial_property`, `residential_property`, `vacant_land`
      - Asset Address
      - Loan amount and estimated property value
      - Loan type (Construction, Lease Doc, Low Doc, Private/Short Term, Unsure)
      - **Loan purpose (SINGLE selection only)**:
        - Database constraint allows only ONE loan purpose per opportunity
        - Valid values: `purchase_owner_occupier`, `purchase_investment`, `refinance`, `equity_release`, `land_bank`, `business_use`, `commercial_equipment`
        - Uses radio buttons, not checkboxes
    - **Financial details with conditional fields**:
      - Rental income funding (Yes/No)
      - Net profit, amortisation, depreciation (if No)
      - Proposed rental income
      - Other financial questions
    - **Automatic Calculations** (Read-only, auto-calculated):
      - LVR (Loan to Value Ratio): (Loan Amount / Estimated Property Value) × 100
      - ICR (Interest Coverage Ratio): Total Income Servicing / Total Interest
      - **IMPORTANT**: ICR and LVR are NOT manually editable in edit dialogs - they auto-calculate based on other field values
      - LVR recalculates when Loan Amount or Property Value changes
      - ICR recalculates when any financial detail changes (Net Profit, Amortisation, Depreciation, Existing Interest, Rental Expense, Proposed Rental Income)
    - **Outcome Assessment**: Real-time deal evaluation:
      - Green: Deal looks good (ICR ≥ 2, LVR ≤ 65)
      - Yellow: Needs confirmation (ICR ≥ 2, LVR 65-80, or any financial concerns)
      - Red: Requires further assessment (ICR < 1.5)
    - Additional notes
    - Terms & conditions acceptance (4 checkboxes)

### 4. Opportunities vs Applications (NEW - December 2024)

The system now separates opportunities and applications into distinct views:

**Opportunities Page** (`/admin/opportunities`):
- Shows ONLY opportunities with status `"opportunity"`
- Early-stage deals not yet converted to applications
- Excludes unqualified opportunities
- "Add Opportunity" button for new entries

**Applications Page** (`/admin/applications`) (NEW):
- Shows opportunities with status >= `application_created`
- Includes: application_created, application_submitted, conditionally_approved, approved, declined, settled, withdrawn
- Excludes unqualified opportunities
- No "Add" button (applications come from opportunities)
- Same table design for consistency

**Unqualified Opportunities** (`/admin/opportunities/unqualified`):
- Separate page for opportunities marked as unqualified
- Shows unqualified reason and date
- Does NOT appear in Opportunities or Applications lists
- Accessible via "Unqualified Opportunities" button

**API Filtering**:
- `/api/admin/opportunities` - All opportunities (no filter)
- `/api/admin/opportunities?status=opportunity` - Only "opportunity" status
- `/api/admin/opportunities?status=applications` - Only application-stage statuses
- All endpoints automatically exclude unqualified opportunities (where `opportunity_details.is_unqualified = 1`)

### 5. Opportunity Workflow
```
Pre-Assessment (optional) → Draft → Opportunity → Application → Settlement/Declined/Withdrawn
                                           ↓
                                    Unqualified (separate view)
```
- Each status change triggers email to referrer and/or client
- Drafts can be saved indefinitely
- Only Loanease can change status (except draft→opportunity)
- Marking as "Unqualified" removes from main Opportunities/Applications views

### 6. Client Management (COMPLETED - November 2024)

**View All Clients** (`/admin/clients`):
- List all clients across all referrer organizations
- Table columns:
  - Entity Name (company or individual name)
  - First Name, Last Name (contact person)
  - Email, Mobile (contact details)
  - State (location)
  - Referrer Group (organization name)
  - Referrer Name (who created the client)
  - Opportunities count (total opportunities for this client)
- Search functionality
- CSV export capability
- Click-through to client detail page

**View Client Details** (`/admin/clients/[id]`):
- Comprehensive client information display:
  - **Client Details section**:
    - Borrowing Entity Type (Private company, Sole trader, SMSF Trust, Trust, Partnership, Individual)
    - Borrowing Entity Name
    - Borrower Contact (full name)
    - Mobile, Email
    - Industry
    - Company Address
  - **Edit Client button**: Opens dialog to update client information
  - **Opportunities table**: Lists all opportunities for this client with:
    - Deal ID
    - Date Created
    - Borrowing Entity
    - Referrer Name
    - Referrer Type
    - Loan Amount
    - Status (colored badges)
  - Click-through to opportunity details
- **Statistics cards**:
  - Total Finance Amount (sum of all loan amounts)
  - Upcoming Settlements (count of non-settled opportunities with target dates)

**Edit Client** (`EditClientDialog` component):
- Dialog with form to update client details:
  - Entity Type (dropdown with 6 options: 1-6)
  - First Name, Last Name (required)
  - Mobile, Email (required)
  - Company Address
- Updates both `clients` table and `client_details` table (upsert pattern)
- Success toast notification
- Automatic refresh of client data
- Audit logging for all changes

**API Endpoints**:
- `GET /api/admin/clients/all` - List all clients with organization and user joins
- `GET /api/admin/clients/[id]` - Get client details with opportunities
- `PATCH /api/admin/clients/[id]/update` - Update client information
- `GET /api/admin/clients/export/csv` - Export all clients to CSV

**Database Integration**:
- Uses `clients` table for main client data
- Uses `client_details` table for address breakdown
- Entity type stored as INTEGER (1-6) and formatted for display
- Column names: `contact_first_name`, `contact_last_name`, `contact_email`, `contact_phone`
- Upsert pattern for client_details (check exists, update or insert)

**Key Features**:
- Entity type properly formatted from integer to display text
- Separate name fields (first/last) instead of single borrower_contact
- Address data stored in both clients.address and client_details.address
- All data isolation enforced (referrers see only their clients)
- CSV export with proper column mapping

### 7. Potential Referrers Management (NEW - November 2024)

Admin page for managing contacts from the pre-assessment tool.

**Features**:
- **List All Contacts** (`/admin/potential-referrers`):
  - Table columns: S. No., Date, Name, Email, Phone, Actions
  - Search functionality (filters by name, email, phone)
  - Shows submission count
  - Click-through actions: View, Delete
- **CSV Export**:
  - "Download CSV" button in header
  - Exports all contacts with: S. No., Date, Name, Email, Phone
  - Filename: `Potential-Referrers-{timestamp}.csv`
  - Loading state during download
- **Delete Functionality**:
  - Delete button with trash icon
  - Confirmation dialog: "Are you sure you want to delete this contact?"
  - Audit logging for deletions
  - Success toast notification
  - Automatic list refresh after deletion
- **Design**:
  - Matches Clients page design (white card, proper spacing)
  - Gradient background (teal to green)
  - Responsive layout (max-w-[1440px])
  - Added to navigation menu with UserPlus icon

**API Endpoints**:
- `GET /api/admin/potential-referrers` - List all pre-assessment contacts
- `DELETE /api/admin/potential-referrers/[id]` - Delete contact with audit log
- `GET /api/admin/potential-referrers/export/csv` - Export to CSV

**Security**:
- Only super_admin and admin_team can access
- RLS enforced on pre_assessment_contacts table
- All deletions logged in audit_logs

### 8. Settings Management (NEW - November 2024)

Centralized settings system for application-wide configurations.

**Main Settings Page** (`/admin/settings`):
- 3 card-based options with gradient background (teal to green)
- Cards:
  1. **General Settings** - Opportunity alerts, referrer alerts, loan declined reasons, interest rate, commission split
  2. **Terms & Conditions** - Terms editor and referrer fees
  3. **Login History** - Placeholder for future login tracking

**General Settings Page** (`/admin/settings/general`):
- **Opportunity Alert Email**:
  - Textarea for email addresses (one per line)
  - Saves to `opportunity_alert_emails` setting
- **New Referrer Alert**:
  - Textarea for email addresses (one per line)
  - Saves to `new_referrer_alert_emails` setting
- **Loan Declined Reasons**:
  - Add/Edit/Delete management
  - List view with edit (Pencil icon) and delete (Trash icon) actions
  - Dialog for editing individual reasons
  - Input field with "Add" button for new reasons
  - Enter key support for quick adding
  - Saves to `loan_declined_reasons` (JSON array)
- **Interest Rate**:
  - Number input with step 0.1
  - Saves to `default_interest_rate` setting
- **Commission Split**:
  - Textarea (h-32)
  - Saves to `commission_split` setting
- All sections have individual "Save" buttons
- Loading states during save operations
- Success/error toast notifications

**Terms & Conditions Page** (`/admin/settings/terms`):
- **Terms & Conditions**:
  - Large textarea (h-64) with monospace font
  - Saves to `terms_and_conditions` setting
- **Referrer Fees**:
  - Textarea (h-32)
  - Saves to `referrer_fees` setting
- Individual "Save" buttons per section
- Loading states and toast notifications

**Login History Page** (`/admin/settings/login-history`):
- Placeholder page with "coming soon" message
- Future feature for tracking user login history

**Implementation Details**:
- **Database**: Uses `global_settings` table with key-value structure
- **API Endpoints**:
  - `GET /api/admin/settings` - Fetches all settings, converts JSON types to objects
  - `POST /api/admin/settings` - Upserts setting with automatic type detection
- **Data Persistence**:
  - Pages load settings on mount via `useEffect` and `fetchSettings()`
  - Save handlers make real API calls to persist data
  - Upsert pattern: Updates existing or inserts new settings
- **Type Detection**:
  - Arrays → JSON type (stringified)
  - Numbers → Number type (converted to string for storage)
  - Long text (>100 chars) → Textarea type
  - Default → Text type
- **Audit Logging**: All setting changes logged in `audit_logs` table
- **Security**: Only super_admin and admin_team can view/edit settings

### 9. ABN Integration
- Validate Australian Business Numbers via ABR API
- Auto-populate business details
- Check for existing clients within referrer's scope only

### 10. Commission Structure
- Global default in settings (text/JSON)
- Per-referrer override possible
- No calculations in app - purely informational

## Security Requirements

### Critical Security Features
1. **2FA via 6-digit email code** (Loanease mandatory, Referrer optional)
2. **Brute force protection** (rate limiting on login attempts)
3. **IP tracking & notifications** for unusual logins
4. **Audit trail** for all modifications
5. **File access** only through authenticated application
6. **Encrypted environment variables** for API keys
7. **HTTPS only** with secure cookies
8. **CORS properly configured** for API routes

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
POSTMARK_API_KEY=
ABR_API_GUID=
NEXT_PUBLIC_APP_URL=
```

## Email Templates (Postmark)

Templates needed (use aliases):
- welcome-referrer
- welcome-team-member
- user-invitation (for inviting team members to organizations)
- new-opportunity
- status-change-{status}
- 2fa-code (twofactor-code)
- new-ip-login
- password-reset (NEW - with fields: first_name, reset_url, expiry_hours)
- email-verification

**Important**: Provide HTML with inline styles, no conditional logic for Postmark.

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Async/await over promises
- Server Components by default, Client Components when needed
- Use Supabase queries in Server Components where possible

### Security Best Practices
1. Never expose sensitive data in client components
2. Always validate input on both client and server
3. Use parameterized queries (Supabase handles this)
4. Implement rate limiting on all public endpoints
5. Log security events (failed logins, permission denials)
6. Use CSP headers

### File Upload Guidelines
- Max size: 15MB
- Store in Supabase Storage with RLS
- Generate signed URLs for temporary access
- Implement virus scanning if possible
- Never serve files directly, always through application

### Testing Approach
- Staging environment mirrors production
- Test with real Supabase instance (not local)
- Critical flows to test:
  - Complete opportunity lifecycle
  - User permissions and data isolation
  - Email notifications
  - ABN lookup and validation

## Common Tasks

### Managing Referrer Organizations
**Adding a new referrer:**
1. Use `/admin/referrers` page with "Add Referrer" dialog
2. Required fields: company name, ABN, contact details
3. Optional: commission structure override, status
4. API endpoint: `/api/admin/referrers/create`

**Editing a referrer:**
1. Navigate to `/admin/referrers/[id]/edit`
2. Update organization details as needed
3. API endpoint: `/api/admin/referrers/[id]/update`

**Viewing referrer details:**
1. Navigate to `/admin/referrers/[id]`
2. Shows comprehensive stats, users, and recent activity

**Inviting team members:**
1. Navigate to referrer detail page
2. Click "Add User" in the Users tab
3. Enter email address and role
4. System sends invitation email
5. API endpoint: `/api/admin/referrers/invite`

### Managing Opportunities
**Viewing opportunities:**
1. Navigate to `/admin/opportunities` to see all opportunities
2. Table displays: Deal ID, Date Created, Borrowing Entity, Loan Type, Referrer Name, Referrer Type, Loan Amount, and Status
3. Click "View" button to see opportunity details
4. Click "Add Opportunity" to create new opportunity

**Viewing opportunity details:**
1. Navigate to `/admin/opportunities/[id]`
2. View comprehensive opportunity information organized in sections:
   - **Client Details**: Entity Type, Entity Name, Contact Name, Mobile, Email, Address, ABN, Time in Business, Industry, Brief Overview
   - **Loan Details**: Type of Asset, Asset Address, Loan Amount, Estimated Property Value, Loan Type, Loan Purpose, Lender
   - **Financial Details**: Net Profit, Amortisation, Depreciation, Existing Interest, Rental Expense, Proposed Rental Income, ICR, LVR
   - **Opportunity Notes** (activity timeline)
3. Right sidebar shows:
   - Target Settlement date
   - Date Settled
   - Application Progress tracker (visual workflow)
4. Click edit icons on each section to modify details (opens dialog with all fields)
5. Click "Add External Ref #" to add external reference number
6. Click date buttons to set target settlement or settled dates
7. All enum-like fields (entity_type, asset_type) are automatically formatted for display
8. API endpoints:
   - GET `/api/admin/opportunities/[id]` - Fetch opportunity details
   - PATCH `/api/admin/opportunities/[id]` - Update opportunity

**Viewing opportunities:**
1. Navigate to `/admin/opportunities` to see all opportunities
2. Table displays: Deal ID, Date Created, Borrowing Entity, Loan Type, Referrer Name, Referrer Type, Loan Amount, and Status
3. Click "View" button to see opportunity details

**Viewing and editing opportunity details:**
1. Navigate to `/admin/opportunities/[id]`
2. View comprehensive opportunity information organized in sections:
   - **Client Details**: Entity Type, Entity Name, Contact Name, Mobile, Email, Address, ABN, Time in Business, Industry (dropdown with 14 options), Brief Overview
   - **Loan Details**: Type of Asset (dropdown with 3 options), Asset Address, Loan Amount, Estimated Property Value, Loan Type (snake_case), Loan Purpose, Lender
   - **Financial Details**: Net Profit, Amortisation, Depreciation, Existing Interest, Rental Expense, Proposed Rental Income, ICR (read-only, auto-calculated), LVR (read-only, auto-calculated)
   - **Opportunity Notes** (activity timeline)
3. Right sidebar shows:
   - External Reference (click "Add External Ref #" to add)
   - Target Settlement date
   - Date Settled
   - Application Progress tracker (visual workflow)
4. Click edit icons on each section to modify details (opens dialog with all fields)
5. All enum-like fields (entity_type, asset_type, industry, loan_type) are automatically formatted for display
6. **ICR and LVR fields are read-only** - they auto-calculate based on other values
7. API endpoints:
   - GET `/api/admin/opportunities/[id]` - Fetch opportunity details
   - PATCH `/api/admin/opportunities/[id]` - Update opportunity (validates field values against database constraints)

**Adding a new opportunity:**
1. Navigate to `/admin/opportunities` and click "Add Opportunity"
2. Select referrer organization and user
3. Choose new or existing client
4. Fill in client details (for new clients):
   - First Name, Last Name, Mobile, Email (all required)
   - Entity Type (dropdown with database values like `private_company`)
   - Entity Name, ABN, Company Address
   - Time in Business (free text, e.g., "4 Years")
   - Industry (dropdown with 19 categories)
   - Brief Overview (required)
5. Optionally add detailed loan information:
   - Type of Asset (dropdown: `commercial_property`, `residential_property`, etc.)
   - Asset Address
   - Loan amount and estimated property value
   - Loan type and purpose (single selection via radio buttons)
   - Financial details (automatically calculates ICR and LVR)
   - Answer financial questions
6. Review automatic outcome assessment
7. Add additional notes
8. Accept terms & conditions (all 4 required)
9. Click "Save & Submit Opportunity"
10. API endpoint: `/api/admin/opportunities/create`

**Understanding outcome assessments:**
- **Green**: ICR ≥ 2 AND LVR ≤ 65, all financial questions answered "No"
- **Yellow**: ICR ≥ 2 with LVR 65-80, or any financial concerns
- **Red**: ICR < 1.5, requires further assessment

**Important validation notes:**
- Loan purpose must be ONE selection only (radio button, not checkboxes)
- Use correct spelling: `organisation_id` for clients, `organization_id` for opportunities
- Loan purpose values must use underscores: `purchase_owner_occupier`, `land_bank`, etc.
- Entity type must use database values: `private_company`, `sole_trader`, etc. (NOT "Private Company", "Sole Trader")
- Asset type valid values (ONLY 3): `commercial_property`, `residential_property`, `vacant_land` (NOT industrial_property, mixed_use, etc.)
- Loan type valid values (snake_case): `construction`, `lease_doc`, `low_doc`, `private_short_term`, `unsure` (NOT "Construction", "Lease Doc", etc.)
- Industry must use dropdown values (14 specific options) - NOT free text input
- All enum-like fields should be formatted for display using helper functions like `formatEntityType()`, `formatAssetType()`, `formatIndustry()`, `formatLoanType()`
- **ICR and LVR are auto-calculated** - do not allow manual editing in forms

**Calculation formulas:**
```
LVR = (Loan Amount / Estimated Property Value) × 100

Total Income Servicing = Net Profit + Amortisation + Depreciation +
                         Existing Interest Costs + Rental Expense +
                         Proposed Rental Income

Total Interest = Existing Interest Costs + (Loan Amount × Interest Rate / 100)

ICR = Total Income Servicing / Total Interest
```

### Adding a new status
1. Update opportunity status enum in database
2. Add status to TypeScript types
3. Create/update Postmark email template
4. Add status change logic to opportunity service
5. Update UI to show new status

### Adding a new user role
1. Update users table role enum
2. Add RLS policies for new role
3. Update middleware auth checks
4. Add role-specific routes and components

### Implementing audit logging
```typescript
// Use this pattern for audit logging
await supabase.from('audit_logs').insert({
  user_id: userId,
  table_name: 'opportunities',
  record_id: opportunityId,
  action: 'update',
  field_name: 'status',
  old_value: oldStatus,
  new_value: newStatus,
  ip_address: request.ip,
  user_agent: request.headers['user-agent']
});
```

## Future Considerations

- **Mobile App**: API design should support future React Native app
- **Client Portal**: Database structure supports future client access
- **Groups of Companies**: Tag-based system for grouping related ABNs
- **HubSpot Integration**: Prepare for CRM sync
- **In-app messaging**: Comment system can evolve to full messaging

## Important Notes

1. **No payment processing** - Commission tracking is informational only
2. **Australian market focus** - All dates/times in AEST/AEDT
3. **Opportunity numbering** - Use Supabase sequence for CF10000+ IDs
4. **Client uniqueness** - Clients are unique per referrer, not globally
5. **Vertical development** - Build complete features end-to-end
6. **Database inconsistencies** - Column names vary between tables (organisation_id vs organization_id)
7. **Loan purpose constraint** - Only ONE loan purpose value allowed per opportunity
8. **Value formatting** - Always use underscores in enum-like values (purchase_owner_occupier, not purchase-owner-occupier)
9. **Enum field storage vs display** - Store snake_case values in database, format for display with helper functions
10. **Required formatting functions** - Use `formatEntityType()`, `formatAssetType()`, `formatIndustry()`, and `formatLoanType()` to convert database values to display-friendly labels
11. **ICR and LVR calculation** - These fields are stored in the database and displayed as read-only values. They are auto-calculated only when editing financial/loan details in dialogs, NOT on page load. Never add useEffect hooks that recalculate these values when viewing opportunities.
12. **Data consistency between views** - Admin and referrer views must display identical data from the same source (database). Never use hardcoded fallback values or client-side calculations that could cause discrepancies. Empty fields should display as `-` in both views.
13. **Missing database columns** - The `external_ref` and `icr` columns must be added to the opportunities table (see migration file)
14. **Helper scripts available** - Use `/scripts/check-opportunities-columns.js` to verify column existence, `/scripts/add-missing-columns.js` for migration instructions
15. **Table split structure** - Opportunities data is split across two tables: `opportunities` (core) and `opportunity_details` (extended). API handles this automatically. See `OPPORTUNITIES_TABLE_SPLIT.md` for details.
16. **Client entity types** - Stored as INTEGER (1-6) in database, must be converted to string for Select components and formatted for display
17. **Client column names** - Use `contact_first_name`, `contact_last_name`, `contact_email`, `contact_phone` (NOT `first_name`, `last_name`, `email`, `mobile`)
18. **Client details table** - Address information stored in both `clients.address` and `client_details.address` using upsert pattern
19. **Next.js 15 async params** - All route handlers and pages must await params as Promise (see Troubleshooting section for migration examples)
20. **Updated_at fields removed** - All `updated_at` columns and their triggers have been removed from all tables (November 2024). Only `created_at` timestamps are used for tracking. Migration: `supabase/migrations/20241120_remove_updated_at_from_all_tables.sql`
21. **Pre-assessment tool** - Public-facing calculator at `/pre-assessment` that saves only contact info (no financial data stored). Results page shows ICR/LVR calculations and outcome assessment with call-to-action to register.
22. **Potential Referrers management** - Admin page at `/admin/potential-referrers` for managing pre-assessment contacts. Includes CSV export and delete functionality. Uses `pre_assessment_contacts` table.
23. **Settings system** - Centralized settings at `/admin/settings` with General Settings (opportunity alerts, referrer alerts, loan declined reasons, interest rate, commission split) and Terms & Conditions. All settings stored in `global_settings` table with upsert pattern and audit logging.

## Troubleshooting Common Issues

### Database Errors

**"Could not find a relationship between 'opportunities' and 'users' in the schema cache"**
- No foreign key constraint exists between opportunities and users tables
- Cannot use Supabase auto-joins (e.g., `users!opportunities_created_by_fkey(*)`)
- Solution: Fetch users separately and join manually in code
- Example:
  ```typescript
  // Fetch opportunities first
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*, created_by')

  // Get unique user IDs
  const userIds = [...new Set(opportunities.map(o => o.created_by))]

  // Fetch users separately
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, surname')
    .in('id', userIds)

  // Create lookup map and join in code
  const userMap = new Map(users.map(u => [u.id, u]))
  const enriched = opportunities.map(opp => ({
    ...opp,
    creator: userMap.get(opp.created_by)
  }))
  ```

### Database Errors

**"Could not find column in schema cache"**
- The column name you're using doesn't match the actual database column
- Check if it should be `organisation_id` (British) or `organization_id` (American)
- TypeScript types may be incorrect - verify directly with database

**"violates check constraint 'check_loan_purpose'"**
- Trying to insert multiple loan purpose values
- Only ONE loan purpose value allowed per opportunity
- Ensure you're sending a single string, not an array or comma-separated list
- Valid values: `purchase_owner_occupier`, `purchase_investment`, `refinance`, `equity_release`, `land_bank`, `business_use`, `commercial_equipment`

**"violates check constraint 'check_entity_type'"**
- The entity_type value must be one of the valid snake_case values
- Valid values: `private_company`, `public_company`, `sole_trader`, `partnership`, `trust`, `individual`
- Do NOT send display values like "Private Company", "Sole Trader", etc.
- Use Select dropdown with correct database values, then format for display using helper function

**"violates check constraint 'check_asset_type'"**
- Asset type value is invalid or not in the allowed list
- Valid values (ONLY 3): `commercial_property`, `residential_property`, `vacant_land`
- Common mistake: Using old values like `industrial_property`, `mixed_use`, `development_site`, `land`, `other`
- Solution: Update frontend dropdowns to only show the 3 valid values, use formatAssetType() for display

**"violates check constraint 'check_industry'"**
- Industry value is invalid or not using correct snake_case format
- Must use dropdown with 14 specific values (see Database Constraints section above)
- Common mistake: Using free-text input or display values like "Testing", "Agriculture"
- Solution: Change to Select dropdown with database values, use formatIndustry() for display

**"violates check constraint 'check_loan_type'"**
- Loan type must be in snake_case format
- Valid values: `construction`, `lease_doc`, `low_doc`, `private_short_term`, `unsure`
- Common mistake: Using display format like "Construction", "Lease Doc", "Low Doc"
- Solution: Store snake_case in database, format for display only

**"Could not find the 'external_ref' column" or "Could not find the 'icr' column"**
- These columns are missing from the opportunities table
- Solution: Run migration to add them:
  ```sql
  ALTER TABLE opportunities
    ADD COLUMN IF NOT EXISTS external_ref TEXT,
    ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);

  CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref ON opportunities(external_ref);
  ```
- Location: `supabase/migrations/20241213_add_missing_opportunity_fields.sql`
- Run in Supabase Dashboard > SQL Editor

**"violates foreign key constraint"**
- The referenced ID doesn't exist in the parent table
- For opportunities: ensure `organization_id` exists in `organisations` table
- For clients: ensure `organisation_id` exists in `organisations` table
- Check you're using the organisation ID, not the user ID

### Form Submission Issues

**Referrer ID errors**
- Ensure you're sending `organisation_id` from the referrer object, not the user `id`
- The form dropdown shows users, but you need to extract their `organisation_id`

**Loan purpose validation errors**
- Use radio buttons for single selection, not checkboxes
- Send single string value, not array
- Use underscore format: `purchase_owner_occupier` not `purchase-owner`

**Entity type, asset type, industry, or loan type validation errors**
- Always send database values (snake_case), not display values
- Entity type: `private_company`, `sole_trader`, etc. (NOT "Private Company", "Sole Trader")
- Asset type: `commercial_property`, `residential_property`, `vacant_land` (ONLY 3 options - NOT industrial_property, mixed_use, etc.)
- Loan type: `construction`, `lease_doc`, `low_doc`, `private_short_term`, `unsure` (NOT "Construction", "Lease Doc")
- Industry: Must use dropdown with 14 specific snake_case values (NOT free text)
- Use Select component with database values, then format for display with helper functions
- Example:
  ```typescript
  // CORRECT - Store database value
  <Select value={entityType} onValueChange={setEntityType}>
    <SelectItem value="private_company">Private Company</SelectItem>
  </Select>

  // CORRECT - Format for display
  const formatEntityType = (type: string) => {
    const types = {
      'private_company': 'Private Company',
      'sole_trader': 'Sole Trader',
      // ...
    };
    return types[type] || type;
  };
  ```

**ICR and LVR not editable / auto-calculating**
- ICR and LVR fields should be read-only in edit dialogs
- They auto-calculate based on other field values:
  - LVR = (Loan Amount / Property Value) × 100
  - ICR = Total Income Servicing / Total Interest
- Use read-only Input fields with gray background (`className="bg-gray-50"`)
- Add helper text indicating they're auto-calculated
- Calculations happen in useEffect hooks that watch dependent fields
- Save handlers should calculate and send the computed values to the API

### ESLint and Build Errors

**"`'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`" (react/no-unescaped-entities)**
- JSX requires apostrophes and quotes in text content to be escaped
- Solution: Replace apostrophes with HTML entities
- Examples:
  - `don't` → `don&apos;t`
  - `we'll` → `we&apos;ll`
  - `user's` → `user&apos;s`
- Common locations: UI text, error messages, form labels
- Note: Apostrophes in comments and JavaScript code don't need escaping

**"useSearchParams() should be wrapped in a suspense boundary" (Next.js 15)**
- Next.js 15 requires `useSearchParams()` to be wrapped in a Suspense boundary to prevent SSR bailout
- This error can occur even if your page doesn't directly use `useSearchParams()`
- Common causes:
  - Parent layout or provider component uses `useSearchParams()` without Suspense
  - Client components that access URL search params during SSR
- Solution for page components:
  ```typescript
  'use client';

  import { Suspense } from 'react';

  function PageContent() {
    // All the original page logic
    return <div>...</div>;
  }

  export default function Page() {
    return (
      <Suspense fallback={<LoadingUI />}>
        <PageContent />
      </Suspense>
    );
  }
  ```
- Solution for provider components:
  ```typescript
  'use client';

  import { Suspense } from 'react';
  import { useSearchParams } from 'next/navigation';

  function ProviderContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    // Provider logic using searchParams
    return children;
  }

  export function Provider({ children }: { children: React.ReactNode }) {
    return (
      <Suspense fallback={children}>
        <ProviderContent>{children}</ProviderContent>
      </Suspense>
    );
  }
  ```
- Applied to: LoadingProvider, all admin page components (November 2024)
- Key files fixed:
  - `components/providers/loading-provider.tsx` (root cause - wraps entire app)
  - `app/(dashboard)/admin/opportunities/page.tsx`
  - `app/(dashboard)/admin/applications/page.tsx`
  - `app/(dashboard)/admin/clients/page.tsx`
  - `app/(dashboard)/admin/referrers/page.tsx`
  - `app/(dashboard)/admin/opportunities/unqualified/page.tsx`
  - `app/(dashboard)/admin/settlements/upcoming/page.tsx`

### Next.js 15 Async Params

**"A param property was accessed directly with `params.id`. `params` is now a Promise..."**
- Next.js 15 changed params to be async in route handlers and page components
- Solution for API routes (route.ts):
  ```typescript
  // OLD (Next.js 14)
  export async function GET(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    const clientId = params.id;
  }

  // NEW (Next.js 15)
  export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id: clientId } = await params;
  }
  ```
- Solution for page components (page.tsx):
  ```typescript
  // OLD (Next.js 14)
  export default function Page({ params }: { params: { id: string } }) {
    useEffect(() => {
      fetchData(params.id);
    }, [params.id]);
  }

  // NEW (Next.js 15)
  export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const [clientId, setClientId] = useState<string>('');

    useEffect(() => {
      params.then(({ id }) => {
        setClientId(id);
      });
    }, [params]);

    useEffect(() => {
      if (clientId) {
        fetchData(clientId);
      }
    }, [clientId]);
  }
  ```
- Applied to all client management routes and pages (November 2024)

### Supabase Type Inference Issues (November 2024)

**"Property 'X' does not exist on type 'never'" or "Argument of type 'X' is not assignable to parameter of type 'never'"**
- Supabase generated types sometimes infer query results or parameters as `never`
- This is a known issue with Supabase TypeScript type generation
- Common occurrences:
  - `.select()` queries returning `never` for data
  - `.update()` and `.insert()` parameters typed as `never`
  - User data queries after `.from('users').select().single()`

**Solutions:**

1. **For SELECT queries returning never:**
   ```typescript
   // Define the expected type
   type UserData = {
     id: string;
     role: string;
     organisation_id: string | null;
   } | null;

   const { data: userData } = await supabase
     .from('users')
     .select('id, role, organisation_id')
     .eq('id', userId)
     .single();

   // Cast to the expected type
   const userRoleData = userData as UserData;

   // Now you can safely access properties
   if (userRoleData && userRoleData.role === 'admin') {
     // ...
   }
   ```

2. **For UPDATE/INSERT operations:**
   ```typescript
   // Cast the table query to 'any'
   await (serviceClient
     .from('clients') as any)
     .update(updateData)
     .eq('id', clientId);

   // Or cast the entire operation
   await (serviceClient.from('audit_logs') as any).insert({
     user_id: userId,
     action: 'update',
     changes: data
   });
   ```

3. **Handling null checks:**
   ```typescript
   // Always check for null before accessing properties
   if (!userRoleData || !userRoleData.organisation_id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }

   // TypeScript now knows organisation_id is not null
   const orgId = userRoleData.organisation_id;
   ```

**Files commonly affected:**
- All API routes that query users table
- Routes with `.update()` or `.insert()` operations
- Client and opportunity management endpoints
- Authentication and authorization checks

**Long-term solution:**
- Regenerate Supabase types: `npx supabase gen types typescript --project-id <your-project-id>`
- Update `types/database.ts` with fresh types
- Note: May require adjusting existing code if type structure changes

## Shared Components Architecture (January 2025)

### Overview
To reduce code duplication and ensure consistency between admin and referrer opportunity views, shared components have been created.

### Shared Components (`/components/opportunity/`)

1. **OpportunityClientDetails.tsx**
   - Displays: Entity type, entity name, contact info, ABN, industry, brief overview
   - Props: `opportunity`, `formatEntityType`, `formatIndustry`, `canEdit`, `onEdit`
   - Conditional edit button based on `canEdit` prop

2. **OpportunityLoanDetails.tsx**
   - Displays: Asset type, asset address, loan amount, property value, loan type, loan purpose, lender
   - Props: `opportunity`, `formatCurrency`, `formatAssetType`, `formatLoanType`, `formatLoanPurpose`, `canEdit`, `onEdit`
   - Conditional edit button based on `canEdit` prop

3. **OpportunityFinancialDetails.tsx**
   - Displays: Rental income, net profit, amortisation, depreciation, ICR, LVR, additional questions
   - Includes outcome assessment (green/yellow/red based on ICR/LVR)
   - Props: `opportunity`, `formatCurrency`, `canEdit`, `onEdit`
   - Conditional edit button based on `canEdit` prop

4. **OpportunitySidebar.tsx**
   - Displays: External ref, date created, target settlement, date settled, application progress tracker
   - Visual progress bar with workflow steps
   - Props: `opportunity`, `formatDate`, `canEditDates`, `onEditExternalRef`, `onEditTargetSettlement`, `onEditDateSettled`
   - Conditional edit buttons based on `canEditDates` prop

### Shared Utilities (`/lib/opportunity-utils.ts`)

All formatting functions used by both admin and referrer pages:
- `formatCurrency()` - Formats numbers as AUD currency
- `formatDate()` - Formats ISO dates to "DD MMM YYYY"
- `formatEntityType()` - Converts snake_case to display format
- `formatAssetType()` - Converts snake_case to display format
- `formatIndustry()` - Converts snake_case to display format
- `formatLoanType()` - Converts snake_case to display format
- `formatLoanPurpose()` - Converts snake_case to display format
- `formatStatusDisplay()` - Converts status to display format
- `getStatusColor()` - Returns Tailwind classes for status badges

### Usage

**Admin Page** (with edit capabilities):
```typescript
import { OpportunityClientDetails } from '@/components/opportunity/OpportunityClientDetails';
import { formatEntityType, formatIndustry } from '@/lib/opportunity-utils';

<OpportunityClientDetails
  opportunity={opportunity}
  formatEntityType={formatEntityType}
  formatIndustry={formatIndustry}
  canEdit={true}
  onEdit={handleEditClientDetails}
/>
```

**Referrer Page** (read-only):
```typescript
import { OpportunityClientDetails } from '@/components/opportunity/OpportunityClientDetails';
import { formatEntityType, formatIndustry } from '@/lib/opportunity-utils';

<OpportunityClientDetails
  opportunity={opportunity}
  formatEntityType={formatEntityType}
  formatIndustry={formatIndustry}
  canEdit={false}
/>
```

### Benefits
- **Single source of truth**: All formatting logic in `/lib/opportunity-utils.ts`
- **Consistent UI**: Both admin and referrer see identical layout and data
- **Reduced duplication**: 75% code reduction in referrer page (654 → 166 lines)
- **Easier maintenance**: Update formatting once, applies everywhere
- **Conditional editing**: Same components used with different permission levels

## Reusable Form Components (November 2024)

### Overview
To eliminate code duplication in forms across add opportunity, edit opportunity, and pre-assessment pages, reusable form components with built-in show/hide functionality have been created.

### Reusable Form Components (`/components/`)

#### 1. **ClientFundingRequirements.tsx** (312 lines)
**Purpose**: Encapsulates all loan and funding requirement fields with optional financial details section.

**Features**:
- ✅ Built-in collapsible show/hide toggle (click header to expand/collapse)
- ✅ Chevron icon indicates expanded/collapsed state
- ✅ Optional financial details section (controlled by `showFinancialDetails` prop)
- ✅ Conditional fields based on rental income funding answer
- ✅ Fully controlled component (parent manages all state)
- ✅ TypeScript type safety

**Fields Included**:
- Loan Amount (required)
- Estimated Property Value (required)
- Asset Type (dropdown: Commercial Property, Residential Property, Vacant Land)
- Asset Address
- Loan Type (required - Construction, Lease Doc, Low Doc, Private/Short Term, Unsure)
- Loan Purpose (radio buttons - 7 options)
- **Financial Details** (optional via `showFinancialDetails` prop):
  - Funding question (rental income yes/no)
  - Conditional fields:
    - If Yes: Proposed Rental Income only
    - If No: Net Profit, Amortisation, Depreciation, Existing Interest, Rental Expense, Proposed Rental Income

**TypeScript Interface**:
```typescript
interface FundingRequirementsData {
  loanAmount: string;
  estimatedPropertyValue: string;
  assetType: string;
  assetAddress: string;
  loanType: string;
  loanPurpose: string;
  fundedFromRental: string;
  proposedRentalIncome: string;
  netProfitBeforeTax: string;
  amortisation: string;
  depreciation: string;
  existingInterestCosts: string;
  rentalExpense: string;
}

interface ClientFundingRequirementsProps {
  data: FundingRequirementsData;
  onChange: (field: keyof FundingRequirementsData, value: string) => void;
  showFinancialDetails?: boolean; // Default: true
  isExpanded?: boolean; // Default: true
}
```

**Usage Example**:
```typescript
import { ClientFundingRequirements } from '@/components/ClientFundingRequirements';

const [fundingData, setFundingData] = useState({
  loanAmount: '',
  estimatedPropertyValue: '',
  assetType: '',
  assetAddress: '',
  loanType: '',
  loanPurpose: '',
  fundedFromRental: '',
  proposedRentalIncome: '',
  netProfitBeforeTax: '',
  amortisation: '',
  depreciation: '',
  existingInterestCosts: '',
  rentalExpense: '',
});

const handleFundingChange = (field, value) => {
  setFundingData(prev => ({ ...prev, [field]: value }));
};

<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  showFinancialDetails={true}
  isExpanded={true}
/>
```

**Simplified Usage** (without financial details):
```typescript
<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  showFinancialDetails={false}
  isExpanded={true}
/>
```

#### 2. **OtherQuestions.tsx** (112 lines)
**Purpose**: Encapsulates all "Other Questions" Yes/No fields.

**Features**:
- ✅ Built-in collapsible show/hide toggle (click header to expand/collapse)
- ✅ Chevron icon indicates expanded/collapsed state
- ✅ All 5 Yes/No questions
- ✅ Fully controlled component (parent manages all state)
- ✅ TypeScript type safety

**Questions Included**:
1. Does your business and/or the borrowing entity have any existing liabilities?
2. Are you looking to offer up additional property security to support your equity position?
3. Is the application an SMSF structure?
4. Do you have any existing or overdue ATO / tax liabilities?
5. Do you have any credit file issues e.g. paid or unpaid defaults?

**TypeScript Interface**:
```typescript
interface OtherQuestionsData {
  existingLiabilities: string;
  additionalSecurity: string;
  smsf: string;
  existingATO: string;
  creditIssues: string;
}

interface OtherQuestionsProps {
  data: OtherQuestionsData;
  onChange: (field: keyof OtherQuestionsData, value: string) => void;
  isExpanded?: boolean; // Default: true
}
```

**Usage Example**:
```typescript
import { OtherQuestions } from '@/components/OtherQuestions';

const [otherQuestionsData, setOtherQuestionsData] = useState({
  existingLiabilities: '',
  additionalSecurity: '',
  smsf: '',
  existingATO: '',
  creditIssues: '',
});

const handleOtherQuestionsChange = (field, value) => {
  setOtherQuestionsData(prev => ({ ...prev, [field]: value }));
};

<OtherQuestions
  data={otherQuestionsData}
  onChange={handleOtherQuestionsChange}
  isExpanded={true}
/>
```

### Documentation
- **Complete Usage Guide**: `/components/COMPONENT_USAGE_GUIDE.md`
- **Refactoring Summary**: `/components/COMPONENT_REFACTORING_COMPLETE.md`

### Where to Use
1. ✅ **Pre-Assessment Tool** (`/app/pre-assessment/page.tsx`) - IMPLEMENTED (20% code reduction)
2. ⏳ **Add Opportunity Page** (`/app/(dashboard)/admin/opportunities/add/page.tsx`)
3. ⏳ **Edit Opportunity Dialogs** (All opportunity edit forms)
4. ⏳ **Referrer Add Opportunity** (When implemented)

### Benefits
- **DRY Principle**: Write once, use in multiple pages (eliminates ~380 lines of duplicate code across 5 pages)
- **Consistency**: Identical UI and behavior across all forms
- **Maintainability**: Fix bugs once, apply everywhere
- **Built-in Toggle**: Show/hide functionality included (no external state needed)
- **Type Safety**: Full TypeScript interfaces for compile-time checking
- **Clean Code**: Parent components are 20-30% smaller and more readable

### Key Implementation Details
- **Controlled Components**: All field values managed by parent component state
- **State Management**: Parent creates single data object and onChange handler
- **Toggle State**: Managed internally by each component (no props needed for toggle state)
- **No Validation**: Components are presentational only (parent handles validation)
- **No Side Effects**: Pure components with no external dependencies

## Recent Updates & Features

### Table Sorting Feature (November 23, 2024)
**Purpose**: Add interactive sorting functionality to all table headers across the application

**Features Implemented:**

1. **Reusable SortableTableHead Component** (`/components/ui/sortable-table-head.tsx`):
   - Generic sortable table header component with visual indicators
   - Props:
     - `label`: Display text for the column header
     - `sortKey`: Unique identifier for the column (matches data property name)
     - `currentSortKey`: Currently active sort column
     - `currentSortDirection`: Current sort direction ('asc' | 'desc' | null)
     - `onSort`: Callback function when header is clicked
     - `className`: Optional additional CSS classes
     - `align`: Text alignment ('left' | 'right' | 'center')
   - Visual States:
     - **Not Sorted**: Double arrows icon (ArrowUpDown) in gray
     - **Ascending**: Up arrow icon (ArrowUp) in dark gray
     - **Descending**: Down arrow icon (ArrowDown) in dark gray
   - Interactive: Hover background change, pointer cursor
   - Click behavior: Default → Ascending → Descending → Ascending...

2. **Sorting Implementation Pattern**:
   ```typescript
   // Import component and type
   import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';

   // Add state variables
   const [sortKey, setSortKey] = useState<string | null>('default_field');
   const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

   // Add sort handler
   const handleSort = (key: string) => {
     if (sortKey === key) {
       setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
     } else {
       setSortKey(key);
       setSortDirection('asc');
     }
   };

   // Create sorted array
   const sortedData = [...data].sort((a, b) => {
     if (!sortKey) return 0;
     let aValue: any = a[sortKey as keyof DataType];
     let bValue: any = b[sortKey as keyof DataType];

     // Handle dates
     if (sortKey === 'date_field') {
       aValue = new Date(aValue).getTime();
       bValue = new Date(bValue).getTime();
     }

     // Handle numbers
     if (sortKey === 'number_field') {
       aValue = Number(aValue) || 0;
       bValue = Number(bValue) || 0;
     }

     // Handle strings
     if (typeof aValue === 'string') {
       aValue = aValue.toLowerCase();
       bValue = bValue.toLowerCase();
     }

     if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
     if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
     return 0;
   });

   // Replace TableHead with SortableTableHead
   <SortableTableHead
     label="Column Name"
     sortKey="field_name"
     currentSortKey={sortKey}
     currentSortDirection={sortDirection}
     onSort={handleSort}
   />

   // Use sorted data in map
   {sortedData.map((item) => ...)}
   ```

3. **Pages with Sorting Implemented**:
   - **Admin Portal**:
     - `/admin/opportunities` - 8 sortable columns (Deal ID, Date Created, Borrowing Entity, Loan Type, Referrer Name, Referrer Type, Loan Amount, Status)
     - `/admin/applications` - 8 sortable columns (same as opportunities)
     - `/admin/clients` - 9 sortable columns (Entity Name, Contact Name, Email, Mobile, State, Referrer Group, Referrer Name, Opportunities, Created)
     - `/admin/referrers` - 7 sortable columns (Referrer Group, Key Contact Name, Email, Phone, State, Status, Joined)
     - `/admin/users` - 6 sortable columns (Name, Email, Mobile No, Role, Status, Last Login)
     - `/admin/potential-referrers` - 5 sortable columns (Date, Name, Email, Phone)

   - **Referrer Portal**:
     - `/referrer/opportunities` - 7 sortable columns (Deal ID, Date Created, Borrowing Entity, Contact Name, Loan Type, Loan Amount, Status)
     - `/referrer/applications` - 7 sortable columns (same as opportunities)
     - `/referrer/clients` - 6 sortable columns (Entity Name, Contact Name, Email, Mobile, State, Opportunities)

4. **Technical Implementation Details**:
   - **Type Safety**: Uses TypeScript with SortDirection type ('asc' | 'desc' | null)
   - **Data Type Handling**: Proper sorting for dates (converted to timestamps), numbers, and strings
   - **Nullable Fields**: Graceful handling of null/undefined values
   - **Computed Fields**: Support for sorting on computed fields (e.g., contact_name = first_name + last_name)
   - **Filtered Data**: Sorting works seamlessly with search/filter functionality
   - **Default Sort**: Each page has sensible default sort (e.g., entity_name, date_created)
   - **Alignment Support**: Right-aligned and center-aligned headers supported

5. **User Experience**:
   - Click any column header to sort by that column
   - First click: Ascending order
   - Second click: Descending order
   - Third click: Back to ascending (cycles continuously)
   - Visual feedback with arrow icons
   - Hover states for better interactivity
   - Consistent behavior across all tables

**Benefits**:
- Improved data browsing and analysis
- Consistent UX across admin and referrer portals
- Reusable component reduces code duplication
- Type-safe implementation prevents runtime errors
- Works with existing search/filter functionality

### Login History System (November 21, 2024)
**Purpose**: Track and monitor all user login attempts with comprehensive audit trail

**Features Implemented:**

1. **Database Schema** (`supabase/migrations/20241121_create_login_history_table.sql`):
   - New `login_history` table with columns:
     - `id` (UUID, primary key)
     - `user_id` (references auth.users)
     - `email` (TEXT, required)
     - `status` (TEXT: success, failed, blocked)
     - `ip_address` (TEXT, nullable)
     - `user_agent` (TEXT, nullable)
     - `failure_reason` (TEXT, nullable)
     - `created_at` (timestamp)
   - Strategic indexes on user_id, email, status, and created_at
   - RLS policies: Super admins see all, users see only their own

2. **Login History API** (`/app/api/admin/login-history/route.ts`):
   - Fetch login history with pagination (50 per page)
   - Search by email or IP address
   - Filter by status (all, success, failed, blocked)
   - Enriches data with user details (name, role)
   - Only accessible to super_admin role

3. **Automatic Login Tracking** (`/app/api/auth/login/route.ts`):
   - Logs all login attempts automatically:
     - **Success**: Records successful logins with user_id
     - **Failed**: Tracks invalid credentials with attempt count
     - **Blocked**: Logs rate-limited attempts with lockout duration
   - Captures IP address and user agent for security audit
   - Records failure reasons for troubleshooting

4. **Login History UI** (`/app/(dashboard)/admin/settings/login-history/page.tsx`):
   - Complete page at `/admin/settings/login-history`
   - Features:
     - Search box (filters by email or IP address)
     - Status filter dropdown (All/Success/Failed/Blocked)
     - Paginated table (50 entries per page)
     - Color-coded status badges:
       - Green: Success
       - Red: Failed
       - Orange: Blocked
     - Role badges (Super Admin, Admin, Referrer Admin, Referrer Team)
     - Australian date/time format
     - Displays: Date & Time, User, Email, Role, Status, IP Address, Reason
   - Empty state when no history exists
   - Loading state with spinner

**Security Features:**
- Complete audit trail of all authentication attempts
- IP tracking for suspicious activity detection
- Rate limiting enforcement (5 attempts = 30 min lockout)
- Failure reason logging for security analysis
- User enumeration prevention (generic error messages)

**User Flow:**
```
1. Navigate to Settings → Login History
2. View all login attempts with filters
3. Search by email or IP address
4. Filter by status (success/failed/blocked)
5. Navigate pages to see historical data
```

**Important Notes:**
- Database migration must be run manually in Supabase dashboard
- Login history starts tracking after migration is applied
- Historical login data before migration is not captured
- Only Super Admins can access login history page

### Settings System with Rich Text Editor (November 21, 2024)
**Purpose**: Centralized settings management using existing global_settings table with rich text editing capabilities

**Database Schema Update:**
- **Uses existing `global_settings` table** with columns:
  - `id` (UUID, primary key)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `key` (TEXT, unique)
  - `value` (TEXT)
  - `description` (TEXT, nullable)
- All settings stored as strings (arrays/objects are JSON stringified)
- Upsert pattern: Updates existing or inserts new settings

**Settings API Update** (`/app/api/admin/settings/route.ts`):

**GET Endpoint:**
- Reads from `key` and `value` columns
- Attempts to JSON.parse each value (for arrays/objects)
- Falls back to string if parsing fails
- Returns settings object with all values

**POST Endpoint:**
- Accepts `setting_key`, `setting_value`, and optional `description`
- Automatically detects data type:
  - Arrays → JSON.stringify
  - Numbers → Convert to string
  - Text → Store as-is
- Upserts to database using `key` as unique identifier
- Updates `updated_at` timestamp
- Returns success/error response

**Rich Text Editor Implementation:**

1. **RichTextEditor Component** (`/components/RichTextEditor.tsx`):
   - Built with TipTap editor (@tiptap/react, @tiptap/starter-kit)
   - Features:
     - **Toolbar with formatting options**:
       - Bold, Italic
       - Heading 2
       - Bullet List, Numbered List
       - Undo, Redo
     - **Responsive design** with proper spacing
     - **Placeholder support** for empty content
     - **Auto-save support** (controlled component)
     - **Scrollable editor** with max height of 400px
     - **Gray toolbar background** for clear separation
   - Props:
     - `value`: HTML content string
     - `onChange`: Callback when content changes
     - `placeholder`: Placeholder text
     - `minHeight`: Minimum editor height (default: 400px)
   - SSR-safe: Uses `immediatelyRender: false` to avoid hydration errors
   - Styled with @tailwindcss/typography for proper text rendering

2. **Terms & Conditions Page Update** (`/app/(dashboard)/admin/settings/terms/page.tsx`):
   - Replaced plain Textarea with RichTextEditor
   - Settings:
     - `minHeight="300px"` (starts at 300px)
     - `maxHeight="400px"` (stops growing at 400px, shows scrollbar)
     - Placeholder: "Enter terms and conditions..."
   - Saves HTML content to `terms_and_conditions` setting
   - Loads existing content on page mount
   - Success/error toast notifications

3. **Referrer Fees Section**:
   - Remains as plain Textarea (no rich text needed)
   - Saves to `referrer_fees` setting

**Settings Stored:**
- `opportunity_alert_emails` (textarea)
- `new_referrer_alert_emails` (textarea)
- `loan_declined_reasons` (JSON array)
- `default_interest_rate` (number as string)
- `commission_split` (textarea)
- `terms_and_conditions` (HTML from rich text editor)
- `referrer_fees` (textarea)

**User Experience:**
- Rich text formatting for professional terms & conditions
- Visual toolbar for easy formatting
- Auto-save functionality with success feedback
- Scrollable editor prevents page stretching
- Consistent styling with rest of application

**Technical Details:**
- **TipTap packages installed**: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder
- **Tailwind plugin added**: @tailwindcss/typography for prose styling
- **Editor output**: HTML string stored in database
- **Content sync**: useEffect keeps editor in sync with external value changes
- **SSR compatibility**: `immediatelyRender: false` prevents hydration mismatch

### Login History TypeScript Fixes (November 21, 2024)
**Purpose**: Fix Supabase type inference errors in login history API preventing build

**Issue**:
- TypeScript error: `Property 'user_id' does not exist on type 'never'`
- TypeScript error: `Property 'id' does not exist on type 'never'`
- Build failed due to Supabase returning `never` type for query results

**Solution**:
Added explicit type definitions with type casting in `/app/api/admin/login-history/route.ts`:

1. **LoginHistoryEntry type**:
   ```typescript
   type LoginHistoryEntry = {
     id: string;
     user_id: string | null;
     email: string;
     status: string;
     ip_address: string | null;
     user_agent: string | null;
     failure_reason: string | null;
     created_at: string;
   };
   const loginHistoryData = loginHistory as LoginHistoryEntry[] | null;
   ```

2. **UserInfo type**:
   ```typescript
   type UserInfo = {
     id: string;
     first_name: string;
     surname: string;
     role: string;
   };
   const usersData = users as UserInfo[] | null;
   ```

**Result**:
- ✅ Zero TypeScript errors
- ✅ Build completes successfully
- ✅ Production-ready deployment

### Build Cache Corruption Fix (November 21, 2024)
**Purpose**: Resolve infinite page reload loop caused by corrupted Next.js build cache

**Issue**:
- Error: `Cannot find module './4586.js'`, `Cannot find module './5611.js'`
- Missing webpack chunks in `.next` folder
- Missing manifest files (routes-manifest.json, pages-manifest.json)
- Page keeps reloading infinitely
- Dev server crashes with module not found errors

**Root Cause**:
- Corrupted Next.js build cache in `.next` folder
- Webpack unable to find compiled chunks
- Fast Refresh failing due to runtime errors

**Solution**:
```bash
# 1. Stop dev server
# Kill the running process

# 2. Delete corrupted .next folder
powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }"

# 3. Restart dev server
npm run dev
```

**Prevention**:
- Run `npm run build` regularly to catch issues early
- Clear `.next` folder if you see module not found errors
- Don't manually edit files in `.next` folder
- Use `npm run dev` fresh start after major package updates

**Result**:
- ✅ Dev server starts successfully
- ✅ No module errors
- ✅ No infinite reload loop
- ✅ Clean webpack compilation

### Build and Type System Fixes (November 20, 2024)
**Purpose**: Resolve all TypeScript build errors and ESLint issues for successful Vercel deployment

**Issues Fixed:**

1. **ESLint react/no-unescaped-entities errors** (4 instances)
   - Files: `app/(auth)/reset-password/page.tsx`, `app/(dashboard)/referrer/team/page.tsx`
   - Fixed apostrophes in JSX text: "We've" → "We&apos;ve", "didn't" → "didn&apos;t", etc.
   - All text content now properly escapes special characters

2. **Supabase TypeScript type inference errors** (15+ files affected)
   - Problem: Supabase generated types inferring queries and parameters as `never`
   - Affected operations: `.select()` queries, `.update()` calls, `.insert()` operations
   - Solution: Added type assertions and `as any` casts throughout API routes
   - Files fixed:
     - `app/api/admin/clients/[id]/route.ts`
     - `app/api/admin/clients/[id]/update/route.ts`
     - `app/api/admin/clients/all/route.ts`
     - `app/api/admin/clients/export/csv/route.ts`
     - `app/api/admin/opportunities/[id]/route.ts`
     - `app/api/admin/referrers/[id]/stats/route.ts`
     - `app/api/admin/referrers/export/csv/route.ts`
     - `app/api/admin/settlements/upcoming/route.ts`
     - `app/api/admin/users/[id]/update/route.ts`
     - `app/api/auth/reset-password/confirm/route.ts`
     - `app/api/auth/reset-password/request/route.ts`
     - `app/api/referrer/clients/route.ts`
     - `app/api/referrer/dashboard/route.ts`
     - `app/api/referrer/opportunities/create/route.ts`
     - `app/api/referrer/users/route.ts`

**Pattern used for fixes:**
```typescript
// For SELECT queries
type UserData = {
  role: string;
  organisation_id: string | null;
} | null;
const userRoleData = userData as UserData;

// For UPDATE/INSERT operations
await (serviceClient.from('table') as any).update(data);
await (serviceClient.from('audit_logs') as any).insert(logData);
```

**Result:**
- ✅ Zero TypeScript errors
- ✅ Build completes successfully
- ✅ Ready for Vercel deployment
- ⚠️ Warnings remain (unused variables) but don't block build

**Documentation Updated:**
- Added "Supabase Type Inference Issues" section to Troubleshooting
- Added "ESLint and Build Errors" section with apostrophe escaping guide
- Included code examples and affected file lists

### Data Consistency Fixes (November 19, 2024)
**Purpose**: Ensure admin and referrer views display identical opportunity data

**Issue 1: Hardcoded Fallback Values**
- **Problem**: Admin opportunity detail page had test/placeholder data hardcoded as fallback values
- **Impact**: Admin view showed fake data when database fields were empty, while referrer view showed dashes
- **Location**: `/app/(dashboard)/admin/opportunities/[id]/page.tsx`

**Hardcoded values removed:**
- Company Address: "540 Queen Street, Brisbane City QLD, Australia" → `-`
- Time in business: "4 Years" → `-`
- Mobile: "9119188885" → `-`
- Email: "shinkeyhjn@gmail.com" → `-`
- Borrower Contact: "Shankey Jn" → `-`
- Borrowing Entity Name: "Northbase" → `-`

**Solution**: All fallback values now use `-` to match shared component behavior

**Issue 2: Auto-Calculated ICR and LVR**
- **Problem**: Admin page had `useEffect` hooks that recalculated ICR and LVR on page load
- **Impact**: Admin view showed calculated values while referrer view showed stored database values
- **Location**: `/app/(dashboard)/admin/opportunities/[id]/page.tsx` (lines 210-235, removed)

**What was removed:**
```typescript
// Auto-calculate LVR when loan amount or property value changes
useEffect(() => {
  if (loanAmount > 0 && loanPropertyValue > 0) {
    const calculatedLvr = (loanAmount / loanPropertyValue) * 100;
    setLvr(calculatedLvr);
  }
}, [loanAmount, loanPropertyValue]);

// Auto-calculate ICR when financial details change
useEffect(() => {
  // ... ICR calculation logic
}, [loanAmount, netProfit, amortisation, depreciation, existingInterest, rentalExpense, proposedRentalIncome]);
```

**Solution**:
- Removed auto-calculation useEffect hooks from view page
- ICR and LVR calculations remain in edit dialogs (`handleSaveFinancialDetails`, `handleSaveLoanDetails`)
- Both admin and referrer views now display stored database values only
- Calculations only occur when user edits financial/loan details and saves

**Result**:
- ✅ Admin and referrer views show identical data
- ✅ Empty fields display as `-` consistently
- ✅ ICR and LVR values come from database (single source of truth)
- ✅ Calculations only happen during edit operations, not on view

**Key Files Modified**:
- `/app/(dashboard)/admin/opportunities/[id]/page.tsx`: Removed hardcoded fallbacks and auto-calculations
- `/app/api/admin/opportunities/[id]/route.ts`: Added ICR/LVR to debug logging

### Export Functionality (CSV & PDF)
**Location**: `/app/api/admin/opportunities/[id]/export/`

**CSV Export** (`csv/route.ts`):
- Exports opportunity data in exact format matching "Dispatch Report" template
- Includes all client details, loan details, and financial information
- Formats enum values to human-readable text (entity types, industries, loan types, etc.)
- Filters out invalid ABN values (all zeros)
- Returns as downloadable CSV file: `Application-{opportunity_id}.csv`

**PDF Export** (`pdf/route.ts`):
- Uses `@react-pdf/renderer` for Next.js compatibility
- Generates PDF with light green header (#D4E8D4) matching design template
- Two-column layout (label: value) for all opportunity fields
- Uses `React.createElement()` instead of JSX (works in .ts files)
- Formats all enum values consistently
- Returns as downloadable PDF file: `Application-{opportunity_id}.pdf`

**Frontend Integration**:
- Export buttons added to opportunity detail page header
- Blue "Export CSV" and red "Export PDF" buttons
- Opens exports in new window/downloads file

### ABN Handling
**Issue**: ABN values stored as '00000000000' (all zeros) should display as empty
**Solution**: Filter ABN values containing only zeros across all locations

**Implementation**:
```typescript
// Check if ABN is valid (not all zeros)
(abn && abn.replace(/0/g, '') !== '') ? abn : ''
```

**Applied to**:
- API response (`/api/admin/opportunities/[id]/route.ts`): Returns empty string for invalid ABNs
- Display page: Shows '-' for missing ABN
- Edit dialogs: Empty field for invalid ABNs
- PDF export: Empty string for invalid ABNs
- CSV export: Empty string for invalid ABNs

### Status Display Formatting
**Issue**: Status displayed as database key (e.g., "application_submitted")
**Solution**: Use `formatStatusDisplay()` function to convert to human-readable format

**Status Mappings**:
- `application_created` → "Application Created"
- `application_submitted` → "Application Submitted"
- `conditionally_approved` → "Conditionally Approved"
- `approved` → "Approved"
- `declined` → "Declined"
- `settled` → "Settled"
- `withdrawn` → "Withdrawn"

**Location**: Opportunity detail page header badge

### Missing Field: Existing Liabilities
**Issue**: "Does your business and/or the borrowing entity have any existing liabilities?" value not saving
**Root Cause**: Field saved to `notes` JSON but not returned in API response
**Solution**: Added `existing_liabilities` to API response in `/api/admin/opportunities/[id]/route.ts`

**Implementation**:
```typescript
existing_liabilities: parsedNotes.existing_liabilities || 'No',
```

### Header Layout Alignment
**Issue**: Opportunity detail page header elements (circle icon, deal ID, entity name, reference) not vertically aligned
**Solution**: Restructured header with proper flexbox alignment

**Before**: Single h1 with mixed font sizes causing misalignment
**After**: Separate elements with `flex items-center` for proper vertical centering

```tsx
<div className="flex items-center gap-3">
  <Circle className="h-8 w-8 text-gray-400" />
  <div className="flex items-center gap-3">
    <h1 className="text-2xl font-bold">{opportunity.opportunity_id}</h1>
    <span className="text-sm text-gray-600">{opportunity.client_entity_name}</span>
    {opportunity.external_ref && (
      <span className="text-sm text-gray-600">Ref: {opportunity.external_ref}</span>
    )}
  </div>
</div>
```

### Delete Opportunity
**Issue**: No delete functionality for opportunities
**Solution**: Implemented soft delete with audit trail

**Backend** (`/app/api/admin/opportunities/[id]/route.ts`):
- Added DELETE handler
- Performs soft delete by setting `deleted_at` timestamp
- Logs deletion in `audit_logs` table
- Only super_admin and admin_team can delete

**Frontend** (`/app/(dashboard)/admin/opportunities/[id]/page.tsx`):
- Added `handleDeleteOpportunity` function with confirmation dialog
- Shows success/error toast
- Redirects to opportunities list after deletion

### Unqualified Opportunities Feature
**Purpose**: Mark opportunities as unqualified with reason and list them separately

**Implementation**:

**1. Mark as Unqualified** (`/app/(dashboard)/admin/opportunities/[id]/page.tsx`):
- "Unqualified" button added to opportunity detail page header (orange styling)
- Opens dialog asking for disqualification reason (required field)
- Saves opportunity with:
  - Status: `declined`
  - Notes JSON: `{ is_unqualified: true, unqualified_date: ISO timestamp, unqualified_reason: "..." }`
- Dialog component with light beige background (#F5F5DC)
- Validates that reason is provided before saving

**2. Unqualified Opportunities List Page**:
- **Path**: `/app/(dashboard)/admin/opportunities/unqualified/page.tsx`
- **Accessible via**: "Unqualified Opportunities" button on main opportunities page
- **Displays**: Table with columns:
  - Deal ID
  - Date Created
  - Borrowing Entity
  - Contact Name
  - Referrer Group
  - Loan Amount
  - Unqualified Date
  - Reason (truncated if long)
  - Actions (View button)
- **API Endpoint**: `/app/api/admin/opportunities/unqualified/route.ts`
  - Fetches all opportunities where `notes` contains `is_unqualified: true`
  - Returns formatted data with reason and dates

**3. Navigation**:
- Link added to "Unqualified Opportunities" button on main opportunities page
- Uses Filter icon for visual consistency
- Not included in main navigation menu (contextual access only)

**Data Structure**:
```typescript
// Stored in notes JSON field
{
  is_unqualified: true,
  unqualified_date: "2025-11-13T...",
  unqualified_reason: "Reason text here",
  // ... other notes fields
}
```

**Query Pattern**:
```sql
-- Filter unqualified opportunities
SELECT * FROM opportunities
WHERE notes::jsonb @> '{"is_unqualified": true}'
AND deleted_at IS NULL
```

### Key Files Modified
- `/app/(dashboard)/admin/opportunities/[id]/page.tsx`: Status formatting, header alignment, ABN display, delete functionality, unqualified dialog
- `/app/(dashboard)/admin/opportunities/page.tsx`: Added click handler to "Unqualified Opportunities" button, loan type formatting
- `/app/(dashboard)/admin/opportunities/unqualified/page.tsx`: New page listing unqualified opportunities
- `/app/api/admin/opportunities/[id]/route.ts`: Added existing_liabilities field, ABN filtering, DELETE handler
- `/app/api/admin/opportunities/unqualified/route.ts`: New API endpoint to fetch unqualified opportunities
- `/app/api/admin/opportunities/[id]/export/csv/route.ts`: CSV export with ABN filtering
- `/app/api/admin/opportunities/[id]/export/pdf/route.ts`: PDF export with @react-pdf/renderer and ABN filtering

### Loan Type Display Formatting
**Issue**: Loan Type column in opportunities listing showing database keys (e.g., "low_doc")
**Solution**: Added `formatLoanType()` function to convert keys to display-friendly labels

**Implementation** (`/app/(dashboard)/admin/opportunities/page.tsx`):
```typescript
const formatLoanType = (loanType: string) => {
  if (!loanType) return '-';
  const loanTypeMap: { [key: string]: string } = {
    'construction': 'Construction',
    'lease_doc': 'Lease Doc',
    'low_doc': 'Low Doc',
    'private_short_term': 'Private/Short Term',
    'unsure': 'Unsure'
  };
  return loanTypeMap[loanType] || loanType;
};
```

**Applied to**: Loan Type column in opportunities table

### Removed N/A Display Values
**Issue**: Blank fields displaying "N/A" instead of showing nothing
**Solution**: Replaced all `|| 'N/A'` fallbacks with `|| ''` (empty string)

**Files Updated**:
1. **`/app/api/admin/opportunities/route.ts`**:
   - `borrowing_entity` fallback
   - `referrer_name` fallback
   - `loan_type` fallback
   - `referrer_type` fallback

2. **`/app/(dashboard)/admin/referrers/[id]/page.tsx`**:
   - Company Name, Trading Name, ABN
   - Entity Type, Industry Type
   - Address, Phone (organization)
   - First Name, Surname, Email, Phone (user)
   - Email, Phone (directors)

### User Role Badge Display Fix
**Issue**: Role badges in Users list were hardcoded, not reflecting actual user role from database
**Problem**: After editing a user's role, the badge would still show "Team Member" instead of the updated role

**Root Cause**:
- Badge display logic only checked if user was account owner (Account Owner) or not (Team Member)
- Completely ignored the `user.role` field from database
- API correctly returned and saved roles, but UI didn't display them

**Solution**: Updated badge logic to display actual role from database

**Implementation** (`/app/(dashboard)/admin/referrers/[id]/page.tsx`):
```tsx
<TableCell>
  {user.id === referrer.user?.id ? (
    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
      Account Owner
    </Badge>
  ) : user.role === 'referrer_admin' ? (
    <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
      Admin
    </Badge>
  ) : (
    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
      Team Member
    </Badge>
  )}
</TableCell>
```

**Badge Display Logic**:
- **"Account Owner"** (blue badge) - for the primary referrer contact
- **"Admin"** (purple badge) - for users with `referrer_admin` role
- **"Team Member"** (green badge) - for users with `referrer_team` role

**Related Components**:
- **EditUserDialog** (`/components/EditUserDialog.tsx`):
  - Dialog for editing user password and role
  - Uses `useEffect()` to sync role state when user prop changes
  - Sends updates to `/api/admin/users/[id]/update`
  - Account owner role is protected from changes
- **API Endpoint** (`/api/admin/users/[id]/update/route.ts`):
  - Accepts `password` (optional) and `role` fields
  - Validates permissions (only admins can edit)
  - Audit logging for all changes
- **Users List API** (`/api/admin/referrers/[id]/users/route.ts`):
  - Returns all users in organization with `role` field
  - Used by referrer detail page to display users table

3. **`/app/api/admin/referrers/[id]/route.ts`**:
   - State, Company Name, Contact Name, Phone

4. **`/app/api/admin/referrers/route.ts`**:
   - State, Company Name, Contact Name, Phone

**Result**: Blank fields now display as empty instead of "N/A", providing cleaner UI

### Unqualified Opportunity View Customization
**Issue**: Unqualified opportunities should have simplified view without action buttons
**Solution**: Conditional rendering based on `is_unqualified` status

**Changes** (`/app/(dashboard)/admin/opportunities/[id]/page.tsx`):

**1. Hidden Elements for Unqualified Opportunities**:
- "Unqualified" button (already marked as unqualified)
- "Add External Ref #" button
- Edit icons in Client Details section
- Edit icons in Loan Details section
- Edit icons in Financial Details section

**2. Simplified Right Sidebar**:
- **Normal opportunities**: Shows Target Settlement date, Date Settled, Application Progress tracker
- **Unqualified opportunities**: Shows only the unqualified reason in an orange-styled card

**Implementation**:
```typescript
{opportunity.is_unqualified === 1 ? (
  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-3 text-orange-600">Unqualified Opportunity</h3>
    <p className="text-orange-700 whitespace-pre-wrap">{opportunity.unqualified_reason || 'No reason provided'}</p>
  </div>
) : (
  <>{/* Normal sidebar with Target Settlement, Date Settled, Application Progress */}</>
)}
```

**Visual Design**:
- Orange gradient background (#FFF8DC to #FFE4B5)
- Clear heading "Unqualified Opportunity"
- Reason text displayed with proper whitespace handling
- Clean, minimal design to indicate finalized status

### Notes-to-Columns Migration (December 2024)
**Purpose**: Migrate all structured data from `notes` JSON field to proper database columns

**Status**: ✅ **COMPLETED** - All code changes implemented

**Migration File**: `supabase/migrations/20241214_add_unqualified_columns.sql`

**What Changed**:
1. **Database**: Added 3 new columns to `opportunity_details` table:
   - `is_unqualified` (INTEGER: 1=Yes, 0=No, NULL=Not specified)
   - `unqualified_date` (TIMESTAMP WITH TIME ZONE)
   - `unqualified_reason` (TEXT)

2. **TypeScript Types**: Updated `types/database.ts` with new fields

3. **API Routes Updated**:
   - **CREATE route**: Stores all fields in proper columns (no more notes JSON creation)
   - **GET route**: Reads only from columns (removed notes fallback logic)
   - **PATCH route**: Added unqualified fields support with case-insensitive boolean handling
   - **Unqualified route**: Uses JOIN with `opportunity_details` table, filters on `is_unqualified = 1`

4. **Frontend Updated**: Sends individual fields instead of JSON strings

**Action Required**: Run migration SQL in Supabase Dashboard > SQL Editor

**Benefits**:
- Better performance (indexed columns, no JSON parsing)
- Data integrity (check constraints, foreign keys)
- Easier queries (database-level filtering)
- Type safety (TypeScript knows exact field types)
- Cleaner code (no fallback logic)

**Documentation**: See `NOTES_TO_COLUMNS_MIGRATION_COMPLETE.md` for detailed guide

**Data Mapping Example**:
- `notes.is_unqualified` → `opportunity_details.is_unqualified` (INTEGER)
- `notes.unqualified_date` → `opportunity_details.unqualified_date` (TIMESTAMP)
- `notes.unqualified_reason` → `opportunity_details.unqualified_reason` (TEXT)
- `notes.existing_liabilities` → `opportunity_details.existing_liabilities` (INTEGER: 1/0)
- `notes.net_profit` → `opportunity_details.net_profit` (FLOAT)
- And many more fields...

### Referrer Statistics & Opportunities Tab (December 14, 2024)
**Purpose**: Add real-time statistics and opportunities list to referrer detail page

**Features Implemented**:
1. **Statistics API** (`/app/api/admin/referrers/[id]/stats/route.ts`):
   - Calculates real-time stats for each referrer organization
   - Open Opportunities count (status = 'opportunity')
   - Opportunities Value (total loan amount of open opportunities)
   - Open Applications count (application_created, application_submitted, conditionally_approved, approved)
   - Settled Applications count (status = 'settled')
   - Total Settled Value (sum of settled loan amounts)
   - Conversion Ratio (settled / total × 100)

2. **Referrer Detail Page Updates** (`/app/(dashboard)/admin/referrers/[id]/page.tsx`):
   - Added Overview tab with 6 real-time statistics boxes
   - Added Opportunities / Applications tab showing filtered opportunities for the referrer
   - Statistics update automatically on page load
   - Loading states for better UX

3. **Opportunities API Enhancement** (`/app/api/admin/opportunities/route.ts`):
   - Added `organizationId` query parameter for filtering by referrer
   - Maintains backward compatibility

### Applications Page & Status Filtering (December 14, 2024)
**Purpose**: Separate Opportunities and Applications into distinct views

**Features Implemented**:
1. **New Applications Page** (`/app/(dashboard)/admin/applications/page.tsx`):
   - Dedicated page for application-stage opportunities
   - Shows only opportunities with status >= application_created
   - Excludes unqualified opportunities
   - Same design as Opportunities page for consistency
   - Added to main navigation menu with ClipboardList icon

2. **Opportunities Page Update** (`/app/(dashboard)/admin/opportunities/page.tsx`):
   - Now shows ONLY opportunities with status "opportunity"
   - Excludes unqualified opportunities
   - Maintains "Add Opportunity" button

3. **API Status Filtering** (`/app/api/admin/opportunities/route.ts`):
   - Added `status` query parameter:
     - `?status=opportunity` - Returns only "opportunity" status
     - `?status=applications` - Returns application-stage statuses (application_created, application_submitted, conditionally_approved, approved, declined, settled, withdrawn)
   - Automatic exclusion of unqualified opportunities (joins with opportunity_details, filters is_unqualified !== 1)
   - Applied to all filtered queries (opportunities, applications, referrer-specific)

4. **Navigation Menu Update** (`/app/(dashboard)/admin/layout.tsx`):
   - Added "Applications" link between Opportunities and Referrers
   - Uses ClipboardList icon for visual consistency
   - Available in both desktop and mobile navigation

**Data Flow**:
```
Opportunities Page → API (?status=opportunity) → Excludes unqualified → Display
Applications Page → API (?status=applications) → Excludes unqualified → Display
Unqualified Page → API (unqualified endpoint) → Only unqualified → Display
```

### User Management & Password Reset (December 14, 2024)
**Purpose**: Admin user management and self-service password reset

**Features Implemented**:

1. **Edit User Functionality** (Components & API):
   - **Component**: `/components/EditUserDialog.tsx` - Dialog for editing user details
     - Change user password (optional, with confirmation)
     - Change user role (Admin / Team Member dropdown)
     - Account owner role protected (cannot be changed)
     - Password validation (min 8 characters, must match)
     - Clear error messages
   - **API**: `/app/api/admin/users/[id]/update/route.ts` - PATCH endpoint
     - Updates password using Supabase Admin API
     - Updates role in users table
     - Validates role values (referrer_admin, referrer_team)
     - Audit logging for all changes
     - Only super_admin and admin_team can access
   - **Integration**: `/app/(dashboard)/admin/referrers/[id]/page.tsx`
     - Added Actions column to Users table
     - Edit icon button for each user
     - Opens EditUserDialog with user's current data
     - Success toast and automatic refresh after update

2. **Password Reset Flow** (Pages & API):
   - **Request Page**: `/app/(auth)/reset-password/page.tsx`
     - User enters email address
     - Success state with instructions
     - Prevents email enumeration (always shows success)
     - "Try again" and "Back to Login" options
   - **Confirmation Page**: `/app/(auth)/reset-password/confirm/page.tsx`
     - Accepts token from email link
     - New password entry with confirmation
     - Real-time validation
     - Success state with auto-redirect to login
     - Error handling for invalid/expired tokens
     - Uses Suspense for proper loading state
   - **Request API**: `/app/api/auth/reset-password/request/route.ts`
     - Validates user existence
     - Generates Supabase recovery link
     - Sends email via Postmark
     - Audit logging for reset requests
     - Security: Always returns success to prevent enumeration
   - **Confirm API**: `/app/api/auth/reset-password/confirm/route.ts`
     - Verifies recovery token using Supabase OTP
     - Updates password using Admin API
     - Validates password requirements
     - Audit logging for completed resets
   - **Email Function**: `/lib/email/postmark.ts`
     - Added `sendPasswordResetEmail()` function
     - Uses `password-reset` Postmark template
     - 1-hour expiration for reset links
     - Replaces Supabase URL with app URL
   - **Middleware**: `/middleware.ts`
     - Allows unauthenticated access to reset-password pages
     - Allows `/reset-password/confirm` even if logged in

**Security Features**:
- Email enumeration prevention (always returns success)
- Token-based verification (1-hour expiration)
- Password complexity requirements (min 8 characters)
- Audit logging with IP tracking
- Secure token handling via Supabase Auth
- Account owner role protection

**User Flow**:
```
1. User clicks "Forgot password?" on login → /reset-password
2. Enter email → Request API sends email via Postmark
3. Click link in email → /reset-password/confirm?token=...
4. Enter new password → Confirm API verifies token and updates password
5. Auto-redirect to login → Login with new password
```

**Admin User Management Flow**:
```
1. Navigate to referrer detail page → View users in Users table
2. Click edit icon (Actions column) → EditUserDialog opens
3. Change password and/or role → Submit
4. Success toast → Users table refreshes with updated data
5. Audit log records the change (user_id, IP, user agent, changes)
```

### Admin Users Management System (November 20, 2024)
**Purpose**: Comprehensive user management system for Loanease administrators with role-based access control

**Features Implemented**:

1. **Users Listing Page** (`/app/(dashboard)/admin/users/page.tsx`):
   - **NEW** dedicated admin users management page
   - Lists all admin users (super_admin and admin_team roles)
   - Shows pending invitations with "Invited" status
   - Table columns: Name, Email, Mobile No, Role, Status, Last Login, Actions
   - Search and filter capabilities
   - "Add User" button to invite new administrators
   - Click "View" to see user details and edit

2. **Add Admin User Dialog** (`/components/AddAdminUserDialog.tsx`):
   - Invite new administrators via email
   - Select role: Super Admin or Administrator
   - Sends invitation email with registration link
   - Creates pending invitation in database
   - Only Super Admins can add new administrators

3. **Edit Admin User Dialog** (`/components/EditAdminUserDialog.tsx`):
   - Update user details: First Name, Last Name, Mobile No
   - Change user password (optional, with "Generate Password" button)
   - Change user role (Super Admin or Administrator)
   - Update user status (Active or De-Active)
   - Scrollable form with proper height constraints
   - Role can be changed for any user (Super Admin role is editable)
   - Success toast and automatic refresh after update

4. **User Detail Page** (`/app/(dashboard)/admin/users/[id]/page.tsx`):
   - View comprehensive user information
   - Shows user profile, role, status, 2FA status
   - Last login and creation dates
   - Edit button opens EditAdminUserDialog

5. **User Status Field** (NEW - November 20, 2024):
   - Added `status` column to users table
   - Valid values: `active` or `inactive`
   - De-active users are blocked from logging in
   - Login validation shows error: "Your account is deactive. Please contact support."
   - Migration file: `supabase/migrations/20241120_add_user_status_column.sql`
   - Default status: `active` for all users
   - Status field included in all user APIs and dialogs

6. **Role-Based Access Control** (NEW - November 20, 2024):
   - **Super Admin** (`super_admin`) - Full access to all features including:
     - Users management page (view, add, edit, delete)
     - Settings page
     - All other admin features
   - **Administrator** (`admin_team`) - Access to all features EXCEPT:
     - Users page (hidden from navigation, API blocked with 403)
     - Settings page (hidden from navigation)
   - Navigation menu dynamically filters based on user role
   - API endpoints enforce role-based permissions

7. **API Endpoints**:
   - `GET /api/admin/users` - List all admin users (super_admin only)
   - `POST /api/admin/users` - Create admin invitation (super_admin only)
   - `GET /api/admin/users/[id]` - Get user details (super_admin only)
   - `PATCH /api/admin/users/[id]/update` - Update user (super_admin only)
   - `DELETE /api/admin/users/[id]` - Remove admin access (super_admin only)
   - `GET /api/auth/me` - Get current user profile (all authenticated users)

8. **Admin Layout Updates** (`/app/(dashboard)/admin/layout.tsx`):
   - Fetches user role on mount via `/api/auth/me`
   - Navigation items marked with `superAdminOnly` flag
   - Dynamically filters menu items based on user role
   - Both desktop and mobile navigation respect role restrictions

9. **Registration Fix** (`/app/api/auth/complete-registration/route.ts`):
   - Fixed bug where invited admin users were assigned `referrer_team` role
   - Now correctly reads role from invitation metadata
   - Applies `force_2fa` setting from invitation metadata
   - Admin users get proper role (super_admin or admin_team) on registration

10. **Login Validation**:
    - Checks user status during login
    - De-active users cannot log in
    - Shows clear error message: "Your account is deactive. Please contact support."
    - Audit logging for blocked login attempts
    - Updated: `/app/api/auth/login/route.ts`

**Database Changes**:
- Added `status` column to users table (TEXT, default: 'active')
- Check constraint: status IN ('active', 'inactive')
- Index created: `idx_users_status`
- Migration required: Run SQL in Supabase Dashboard

**Security Features**:
- Only Super Admins can manage users
- Email enumeration prevention in password reset
- Audit logging for all user changes
- Role-based API access control
- De-active users blocked at authentication level

**User Roles Summary**:
```
super_admin:
  - Full access to all features
  - Can manage users (add, edit, delete)
  - Can access settings
  - Can manage all other admin features

admin_team:
  - Access to: Dashboard, Opportunities, Applications, Settlements, Clients, Referrers
  - Cannot access: Users, Settings
  - Full CRUD on accessible features
  - Same data visibility as super_admin
```

**Important Notes**:
1. Status field must exist in database - run migration first
2. Only Super Admins appear in Users page navigation
3. Administrator role users are hidden from Users menu
4. All admin invitations now correctly assign roles from metadata
5. Mobile number field labeled as "Mobile No" throughout the system

### Referrer Dashboard (November 15, 2024)
**Purpose**: Complete referrer portal with navigation, statistics, and opportunities management

**Features Implemented**:

1. **Referrer Layout** (`/app/(dashboard)/referrer/layout.tsx`):
   - Navigation menu with 4 items: Dashboard, Opportunities, Applications, Team
   - Similar design to admin layout
   - Responsive mobile menu with hamburger icon
   - Logout functionality
   - Sticky header with "Loanease Referrer" branding

2. **Referrer Dashboard Page** (`/app/(dashboard)/referrer/dashboard/page.tsx`):
   - **Welcome header** with "Add Opportunity" button (navigates to add page)
   - **Search box** for filtering opportunities
   - **6 Real-time Statistics Cards**:
     - Open Opportunities (dark teal with arrow icon)
     - Opportunity Value (green gradient, displays total loan amount)
     - Open Applications (blue gradient)
     - Settled Applications (orange gradient)
     - Total Settled Value (gray gradient, displays total settled amount)
     - Conversion Ratio (lime green, percentage)
   - **Opportunities Table** with columns:
     - Deal ID
     - Date Created
     - Borrowing Entity
     - Referrer Name (contact name)
     - Loan Amount (formatted currency)
     - Status (colored badges)
   - Click-through to opportunity details
   - Loading state with spinner
   - Empty state when no opportunities exist

3. **Referrer Dashboard API** (`/app/api/referrer/dashboard/route.ts`):
   - Fetches statistics for logged-in referrer organization
   - Returns organization details (for team page)
   - Calculates:
     - Open Opportunities count (status = 'opportunity')
     - Opportunity Value (sum of loan amounts)
     - Open Applications count (statuses: application_created, application_submitted, conditionally_approved, approved)
     - Settled Applications count (status = 'settled')
     - Total Settled Value (sum of settled loan amounts)
     - Conversion Ratio ((settled / total) × 100)
   - Returns last 10 recent opportunities
   - Filters by organization_id (referrers see only their organization's data)
   - Role-based access control (referrer_admin, referrer_team)

4. **Referrer Opportunities Page** (`/app/(dashboard)/referrer/opportunities/page.tsx`):
   - Lists all opportunities with status "opportunity"
   - Table columns: Deal ID, Date Created, Borrowing Entity, Contact Name, Loan Type, Loan Amount, Status, Actions
   - "Add Opportunity" button in header
   - Empty state with create prompt
   - Click "View" to navigate to opportunity details

5. **Referrer Applications Page** (`/app/(dashboard)/referrer/applications/page.tsx`):
   - Lists all application-stage opportunities (application_created through settled)
   - Same table design as opportunities page
   - No "Add" button (applications come from opportunities)
   - Click "View" to navigate to opportunity details

6. **Referrer Opportunities API** (`/app/api/referrer/opportunities/route.ts`):
   - Filters opportunities by referrer's organization
   - Supports status query parameter:
     - `?status=opportunity` - Only "opportunity" status
     - `?status=applications` - All application statuses
   - Automatically excludes unqualified opportunities
   - Returns formatted opportunity data with client info

7. **Referrer Opportunity Detail Page** (`/app/(dashboard)/referrer/opportunities/[id]/page.tsx`):
   - **Read-only view** of opportunity details
   - Sections:
     - Client Details (entity type, name, contact, address, ABN, industry, overview)
     - Loan Details (asset type, address, amounts, loan type, purpose, lender)
     - Financial Details (net profit, amortisation, depreciation, ICR, LVR, etc.)
   - Sidebar with key dates (created, target settlement, date settled)
   - Status badge display
   - All enum fields properly formatted for display

8. **Referrer Opportunity Detail API** (`/app/api/referrer/opportunities/[id]/route.ts`):
   - Fetches opportunity details for referrer's organization only
   - Security: Validates organization_id matches user's organization
   - Returns formatted data with client, loan, and financial details
   - Automatically filters invalid ABN values

9. **Referrer Team Page** (`/app/(dashboard)/referrer/team/page.tsx`):
   - Lists all team members in the referrer's organization
   - Table columns: Name, Email, Role, Last Login
   - Role badges:
     - Account Owner (blue) - Primary referrer contact
     - Admin (purple) - referrer_admin role
     - Team Member (green) - referrer_team role
   - Read-only view (no edit functionality for team members)

10. **Add Opportunity Placeholder** (`/app/(dashboard)/referrer/opportunities/add/page.tsx`):
    - "Coming Soon" message
    - Clean design with green branding
    - "Return to Dashboard" button
    - Note: Feature planned for future release

11. **Referrer Pre-Assessment Tool** (`/app/(dashboard)/referrer/pre-assessment/page.tsx`) (NEW - November 2024):
    - Internal pre-assessment calculator for referrers to evaluate loan opportunities before submission
    - **Simplified form** with only essential fields:
      - Loan Amount (required)
      - Estimated Property Value (required)
      - Funding section with conditional financial details
      - Other Questions (5 Yes/No questions)
    - **Hidden fields** (using `showLoanDetails={false}` prop):
      - Type of Asset, Asset Address, Loan Type, Loan Purpose removed to streamline the assessment
    - **Real-time Outcome Calculation**:
      - ICR (Interest Coverage Ratio) and LVR (Loan to Value Ratio) displayed
      - Color-coded status: Green, Yellow, or Red
      - Specific messages based on calculations
    - **Outcome Logic**:
      - **Green**: ICR ≥ 2, LVR ≤ 65, no financial concerns
      - **Yellow**: ICR ≥ 2, LVR 65-80, OR ICR 1.5-2
      - **Red**: LVR > 80%, OR ICR < 1.5, OR incomplete data
    - **Progress to Opportunity button**:
      - Saves assessment data to sessionStorage
      - Navigates to Add Opportunity page with auto-filled data
    - **Clear Result button**: Resets all form fields and calculations
    - Uses reusable components: `ClientFundingRequirements` and `OtherQuestions`
    - Default interest rate: 8.5% (hardcoded for calculations)

12. **Referrer Clients Page** (`/app/(dashboard)/referrer/clients/page.tsx`) (NEW - November 2024):
    - Lists all clients for the referrer's organization
    - Table columns: Entity Name, Contact Name (merged first+last), Email, Mobile, State, Opportunities count
    - Search functionality (filters by entity name, contact name, email, mobile)
    - CSV export capability
    - Click-through to client detail page
    - Organization-scoped filtering (uses `organisation_id` instead of `created_by`)

13. **Referrer Account Page** (`/app/(dashboard)/referrer/account/page.tsx`) (NEW - November 2024):
    - Complete account management for referrer organizations
    - **Two tabs**: Overview and Login History
    - **Overview Tab**:
      - Organization details (entity name, contact info, ABN, address)
      - Directors list with contact information
      - Users management section with Add/Edit/Delete functionality
      - Commission split information
    - **Login History Tab**:
      - Displays current user's login attempts (filtered by user ID)
      - Shows date/time, status (success/failed/blocked), IP address, failure reason
      - Status filtering and pagination (50 entries per page)
      - Color-coded status badges (green/red/orange)
    - **User Management Features**:
      - **Add User**: Creates user directly in users table (not invitations)
        - Creates auth user in Supabase Auth
        - Creates user profile in users table
        - Generates password reset link for welcome email
        - Fields: First Name, Surname, Phone, Email, Role, Status
      - **Edit User**: Update user details with password reset
        - Edit icon (pencil) next to each user
        - Fields: First Name, Surname, Phone, Role, Password (optional)
        - Password visibility toggle
        - Email field disabled (cannot be changed)
        - Only referrer_admin can edit users
      - **Delete User**: Remove user from organization
        - Red trash icon enabled for all users except account owner
        - Confirmation dialog before deletion
        - Deletes from both Supabase Auth and users table
        - Cannot delete yourself
        - Only referrer_admin can delete users
    - **Directors Management**:
      - Edit organization details to add/update directors
      - Select number of directors (1-5) from dropdown
      - Enter First Name and Surname for each director
      - Directors are stored in `organisation_directors` table
      - Update deletes all existing directors and inserts new ones
      - Only directors with both first and last name are saved
    - **Components**:
      - `/components/EditReferrerAccountDialog.tsx` - Edit organization details and directors
      - `/components/AddReferrerUserDialog.tsx` - Add new user dialog
      - `/components/EditReferrerUserDialog.tsx` - Edit user dialog
    - **API Endpoints**:
      - `GET /api/referrer/account` - Fetch account data (organization, users, directors)
      - `POST /api/referrer/account/add-user` - Create new user
      - `PATCH /api/referrer/account/update-user/[id]` - Update user
      - `DELETE /api/referrer/account/delete-user/[id]` - Delete user
      - `PATCH /api/referrer/account/update-organization` - Update organization and directors
      - `GET /api/referrer/login-history` - Fetch login history

**Security**:
- Role verification: Only referrer_admin and referrer_team can access
- Data isolation: All queries filter by organisation_id to ensure referrers only see their own data
- Separate API endpoints prevent access to admin-only functionality
- Organization validation on all opportunity detail requests

**User Flow**:
```
1. Referrer logs in → Redirected to /referrer/dashboard
2. Dashboard loads → API fetches statistics and recent opportunities
3. Statistics cards display real-time counts and values
4. Table shows last 10 opportunities with click-through to details
5. Navigation menu provides access to:
   - Dashboard (statistics and recent opportunities)
   - Opportunities (full list filtered by status="opportunity")
   - Applications (full list of application-stage opportunities)
   - Clients (organization's client list with merged contact names)
   - Pre-Assessment Tool (internal calculator for loan evaluation)
   - Account (organization and user management)
6. Click opportunity → View read-only opportunity details
7. Use Pre-Assessment Tool to evaluate loans → Auto-fills Add Opportunity page
8. Account page features:
   - View organization details and directors
   - Add new users (creates auth user and profile)
   - Edit user details and reset passwords
   - Delete users (except yourself)
   - View personal login history
```

### Opportunity Detail Page Enhancements (November 15, 2024)
**Purpose**: Display referrer group and team member information with ability to change team member

**Features Implemented**:

1. **Referrer Group and Team Member Section**:
   - Light green gradient section at top of opportunity detail page
   - Displays **Referrer Group** (organization name)
   - Displays **Team Member** (assigned user) as clickable blue link
   - Positioned after header, before main content grid

2. **Edit Referrer Details Dialog**:
   - Opens when clicking on Team Member name
   - Light green gradient background
   - Shows dropdown of all users from the referrer organization
   - Pre-selects current team member
   - "Cancel" and "Save" buttons
   - Updates opportunity's `created_by` field
   - Success toast and automatic page refresh

3. **API Enhancements**:
   - **GET** `/api/admin/opportunities/[id]`:
     - Added `organization_id` and `created_by` to response
     - Enables fetching referrer users and updating team member
   - **PATCH** `/api/admin/opportunities/[id]`:
     - Added `created_by` to list of updatable fields
     - Allows changing the assigned team member
   - **GET** `/api/admin/referrers/[id]/users`:
     - Used to fetch list of users for dropdown
     - Returns all users in the referrer organization

**Implementation Details**:
- **Component**: `/app/(dashboard)/admin/opportunities/[id]/page.tsx`
  - Added handler: `handleOpenEditReferrerDetails()` - Fetches users and opens dialog
  - Added handler: `handleUpdateReferrerUser()` - Saves changed team member
  - State: `referrerUsers`, `selectedReferrerUser`, `editReferrerDetailsOpen`
  - Dialog styled with green gradient to match referrer branding

**User Flow**:
```
1. Navigate to opportunity detail page
2. View Referrer Group and Team Member at top (in green section)
3. Click on Team Member name → Dialog opens
4. Select different team member from dropdown
5. Click "Save" → Updates opportunity and refreshes page
6. New team member name displayed
```

### Key Files Recently Modified
- **Referrer Pre-Assessment Tool & Outcome Calculation Fix** (November 21, 2024):
  - `/app/(dashboard)/referrer/pre-assessment/page.tsx`: **NEW** - Internal pre-assessment tool for referrers
  - `/app/(dashboard)/referrer/clients/page.tsx`: **NEW** - Clients page for referrer portal with merged contact names
  - `/components/ClientFundingRequirements.tsx`: **UPDATED** - Added `showLoanDetails` prop to conditionally hide loan fields
  - **Features Implemented**:
    - Simplified pre-assessment form (removed Type of Asset, Asset Address, Loan Type, Loan Purpose)
    - Real-time ICR and LVR calculations with color-coded outcomes
    - "Progress to Opportunity" button saves data to sessionStorage and auto-fills Add Opportunity page
    - Clients page uses organization-scoped filtering (`organisation_id` instead of `created_by`)
  - **Outcome Calculation Fix**:
    - Fixed case sensitivity: Changed `'Yes'` to `'yes'` for financial concerns check (matching OtherQuestions component values)
    - Standardized outcome logic across Pre-Assessment and Add Opportunity pages
    - **Consistent Logic**: LVR > 80% → Red, ICR ≥ 2 & LVR 65-80 → Yellow, ICR ≥ 2 & LVR ≤ 65 → Green
    - Added specific messages: "LVR too high", "ICR too low", "Requires further assessment"
  - **Files Modified**:
    - `/app/(dashboard)/referrer/pre-assessment/page.tsx`: Updated outcome logic and financial concerns comparison
    - `/app/(dashboard)/referrer/opportunities/add/page.tsx`: Simplified and aligned outcome calculation with pre-assessment page
- **Login History System** (November 21, 2024):
  - `/supabase/migrations/20241121_create_login_history_table.sql`: **NEW** - Migration to create login_history table with RLS policies
  - `/app/api/admin/login-history/route.ts`: **NEW** - API endpoint for fetching login history with pagination, search, and filters (includes TypeScript type fixes)
  - `/app/api/auth/login/route.ts`: **UPDATED** - Added automatic login tracking for success/failed/blocked attempts
  - `/app/(dashboard)/admin/settings/login-history/page.tsx`: **UPDATED** - Complete login history UI with table, search, filters, and pagination
  - **Features**: Tracks all login attempts, IP addresses, user agents, failure reasons; Super admin access only
  - **Security**: Audit trail for authentication, rate limiting enforcement, user enumeration prevention
  - **TypeScript Fixes**: Added explicit type definitions (LoginHistoryEntry, UserInfo) to resolve Supabase `never` type inference errors
  - **Build Issue Fix**: Corrupted `.next` cache causing infinite reload loop - resolved by deleting `.next` folder and restarting dev server
- **Settings System with Rich Text Editor** (November 21, 2024):
  - `/app/api/admin/settings/route.ts`: **UPDATED** - Modified to use existing global_settings table (key, value, description columns)
  - `/components/RichTextEditor.tsx`: **NEW** - Reusable TipTap-based rich text editor component with toolbar and scrolling
  - `/app/(dashboard)/admin/settings/terms/page.tsx`: **UPDATED** - Replaced textarea with RichTextEditor for Terms & Conditions
  - `/tailwind.config.ts`: **UPDATED** - Added @tailwindcss/typography plugin for prose styling
  - **Packages Installed**: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, @tailwindcss/typography
  - **Key Changes**:
    - Uses existing global_settings table (no new table created)
    - GET endpoint reads from key/value columns, parses JSON when needed
    - POST endpoint upserts with automatic type detection
    - Rich text editor with max height 400px, scrollable overflow
    - Toolbar: Bold, Italic, Heading, Lists, Undo/Redo
    - SSR-safe with immediatelyRender: false
- **Pre-Assessment Tool & Potential Referrers** (November 20, 2024):
  - `/app/pre-assessment/page.tsx`: **REFACTORED** - Updated to use ClientFundingRequirements component, removed updated_at field references
  - `/app/pre-assessment/results/page.tsx`: **EXISTS** - Results page with ICR/LVR display and CTA
  - `/app/api/pre-assessment/contact/route.ts`: **NEW** - API to save pre-assessment contact info (first_name, last_name, email, phone only)
  - `/app/(dashboard)/admin/potential-referrers/page.tsx`: **NEW** - List all pre-assessment contacts with CSV export and delete
  - `/app/api/admin/potential-referrers/route.ts`: **NEW** - GET endpoint for listing contacts
  - `/app/api/admin/potential-referrers/[id]/route.ts`: **NEW** - DELETE endpoint with audit logging
  - `/app/api/admin/potential-referrers/export/csv/route.ts`: **NEW** - CSV export endpoint
  - `/app/(dashboard)/admin/layout.tsx`: **UPDATED** - Added Potential Referrers to navigation menu
  - `/supabase/migrations/20241120_create_pre_assessment_contacts.sql`: **NEW** - Migration to create pre_assessment_contacts table
  - **Design**: Matches Clients page design (white card, proper spacing, gradient background)
- **Reusable Form Components** (November 20, 2024):
  - `/components/ClientFundingRequirements.tsx`: **NEW** - Reusable funding requirements component with collapsible toggle (312 lines)
  - `/components/OtherQuestions.tsx`: **NEW** - Reusable questions component with collapsible toggle (112 lines)
  - `/components/COMPONENT_USAGE_GUIDE.md`: **NEW** - Comprehensive usage guide with examples
  - `/components/COMPONENT_REFACTORING_COMPLETE.md`: **NEW** - Refactoring summary and benefits
  - `/app/pre-assessment/page.tsx`: **REFACTORED** - Updated to use ClientFundingRequirements component (20% code reduction: 404 → 322 lines)
  - **Features**: Built-in show/hide toggle, TypeScript type safety, controlled component pattern, optional financial details section
  - **Benefits**: Eliminates ~380 lines of duplicate code across 5 pages, single source of truth, consistent UI/behavior
  - **Future Usage**: Add Opportunity page, Edit Opportunity dialogs, Referrer Add Opportunity page
- **Admin Users Management System** (November 20, 2024):
  - `/app/(dashboard)/admin/users/page.tsx`: **NEW** - Users listing page with table and search
  - `/app/(dashboard)/admin/users/[id]/page.tsx`: **NEW** - User detail page
  - `/components/AddAdminUserDialog.tsx`: **NEW** - Dialog for inviting new administrators
  - `/components/EditAdminUserDialog.tsx`: **UPDATED** - Added status field, mobile no, scrollable form, removed Super Admin role restriction
  - `/app/api/admin/users/route.ts`: **UPDATED** - Added phone/mobile field, status field, restricted to super_admin only
  - `/app/api/admin/users/[id]/route.ts`: **UPDATED** - Added status field, restricted to super_admin only
  - `/app/api/admin/users/[id]/update/route.ts`: **UPDATED** - Added status field validation, restricted to super_admin only
  - `/app/api/auth/me/route.ts`: **NEW** - Get current user profile endpoint
  - `/app/api/auth/login/route.ts`: **UPDATED** - Added status validation, blocks de-active users
  - `/app/api/auth/complete-registration/route.ts`: **UPDATED** - Fixed role assignment bug, now reads from invitation metadata
  - `/app/(dashboard)/admin/layout.tsx`: **UPDATED** - Added role-based navigation filtering, fetches user role
  - `/supabase/migrations/20241120_add_user_status_column.sql`: **NEW** - Migration to add status column
  - `/scripts/fix-admin-user-role.sql`: **NEW** - Script to fix existing user roles
- **Referrer Portal - Complete Implementation** (November 15, 2024):
  - `/app/(dashboard)/referrer/layout.tsx`: **NEW** - Referrer layout with navigation menu
  - `/app/(dashboard)/referrer/dashboard/page.tsx`: **UPDATED** - Complete referrer dashboard with statistics, opportunities table, and working "Add Opportunity" button
  - `/app/(dashboard)/referrer/opportunities/page.tsx`: **NEW** - Referrer opportunities list page (status="opportunity")
  - `/app/(dashboard)/referrer/opportunities/[id]/page.tsx`: **NEW** - Referrer opportunity detail page (read-only view)
  - `/app/(dashboard)/referrer/opportunities/add/page.tsx`: **NEW** - Add opportunity placeholder page
  - `/app/(dashboard)/referrer/applications/page.tsx`: **NEW** - Referrer applications list page
  - `/app/(dashboard)/referrer/team/page.tsx`: **NEW** - Referrer team members page
  - `/app/api/referrer/dashboard/route.ts`: **UPDATED** - Fixed database query error (removed admin_id), added organization data
  - `/app/api/referrer/opportunities/route.ts`: **NEW** - API endpoint for referrer opportunities (with status filtering)
  - `/app/api/referrer/opportunities/[id]/route.ts`: **NEW** - API endpoint for referrer opportunity details
- **Opportunity Detail Page** (November 15, 2024):
  - `/app/(dashboard)/admin/opportunities/[id]/page.tsx`: Added Referrer Group/Team Member section, Edit Referrer Details dialog
  - `/app/api/admin/opportunities/[id]/route.ts`: Added `organization_id` and `created_by` to response, added `created_by` to updatable fields
- **User Management**:
  - `/components/EditUserDialog.tsx`: **NEW** - User edit dialog component with useEffect to sync role state
  - `/app/api/admin/users/[id]/update/route.ts`: **NEW** - User update API endpoint
  - `/app/(dashboard)/admin/referrers/[id]/page.tsx`: Added edit user functionality, Actions column, **FIXED role badge display logic**
- **Password Reset**:
  - `/app/(auth)/reset-password/page.tsx`: **NEW** - Password reset request page
  - `/app/(auth)/reset-password/confirm/page.tsx`: **NEW** - Password reset confirmation page
  - `/app/api/auth/reset-password/request/route.ts`: **NEW** - Request password reset API
  - `/app/api/auth/reset-password/confirm/route.ts`: **NEW** - Confirm password reset API
  - `/lib/email/postmark.ts`: Added sendPasswordResetEmail() function
  - `/middleware.ts`: Updated to allow reset-password pages
- **Previous Features**:
  - `/app/(dashboard)/admin/opportunities/[id]/page.tsx`: Unqualified view customization
  - `/app/(dashboard)/admin/opportunities/page.tsx`: Status filtering, excludes unqualified
  - `/app/(dashboard)/admin/applications/page.tsx`: Applications page
  - `/app/api/admin/opportunities/route.ts`: Status filtering, unqualified exclusion
  - `/app/api/admin/referrers/[id]/stats/route.ts`: Referrer statistics endpoint
  - `/app/(dashboard)/admin/layout.tsx`: Added Applications to navigation