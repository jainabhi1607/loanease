# Features & Workflows Reference

## Authentication & Signup
- Email/password + **mandatory 2FA/OTP for ALL users on every login** (never skip based on `two_fa_enabled` flag)
- OTP always generated and emailed, frontend always redirects to `/login/verify-2fa`
- Password minimum: 10 characters
- Password reset via email (token-based, 1-hour expiration)
- Session management, IP tracking, rate limiting
- `/register` redirects to `/signup`
- Signup stores `agreement_ip` and `agreement_date` in organisations table
- Terms & Conditions loaded dynamically from `global_settings` via `/api/settings/terms`
- **Address entry**: Supports both Mapbox autocomplete AND manual entry with separate fields (Street, Suburb, State dropdown, Postcode)
- **Signup emails** (3 emails sent on registration):
  1. Welcome email with login credentials
  2. Referrer Agreement email with PDF attachment
  3. New Broker Alert email to admin team
- **Team member invitation**: Welcome email sent when referrer admin adds new users

## Opportunity Lifecycle
```
Draft → Opportunity → Application → Settled/Declined/Withdrawn
              ↓
        Unqualified (separate view)
```
- **Opportunities Page**: status = "opportunity"
- **Applications Page**: status >= application_created
- **Unqualified Page**: is_unqualified = 1 (in opportunity_details)
- **Draft opportunities**: Referrers can edit via "Edit Draft" button on detail page

## User Roles & Access

**Super Admin** (`super_admin`):
- Full access including Users and Settings

**Administrator** (`admin_team`):
- All features EXCEPT Users and Settings pages

**Referrer Admin** (`referrer_admin`):
- Organization management, add/edit/delete users
- Can edit External Ref and Team Member on opportunities
- Can add/edit/delete notes on regular opportunities
- Can only add notes on unqualified opportunities (no edit/delete)
- Can edit client details via Edit Client dialog

**Referrer Team** (`referrer_team`):
- View opportunities, clients, applications (read-only)
- Can only access Profile tab on account page (not Account, Team Management, or Login History)

## Referrer Permissions by Opportunity Type

**Regular Opportunities**:
- Can edit: External Ref, Team Member
- Can add/edit/delete notes
- Cannot edit: Target Settlement, Date Settled, opportunity details

**Unqualified Opportunities**:
- Can add notes only (display existing notes, no edit/delete)
- Cannot edit: External Ref, Team Member, or any other fields
- Shows orange "Unqualified Opportunity" banner with reason (same as admin)

## Opportunity Detail Page
- **Overview Tab**: Shows Client Details, Loan Details, Financial Details, Notes
- **History Tab**: Shows audit trail of all changes (date, time, description, user, IP address)
- Both admin and referrer pages have identical tab structure
- History fetched from `audit_logs` table filtered by `record_id` and `table_name='opportunities'`
- Draft status shows "Edit Draft" button for referrers

## Deal Finalisation (Admin only)
- Shows "Add Deal Finalisation Info" link when Date Settled is set
- **Fields**: loan_acc_ref_no, flex_id, payment_received_date (date picker), payment_amount
- **"Save & Return"**: Saves fields only
- **"Finalise & Complete"**: Saves fields + sets `deal_finalisation_status` to "Closed" + creates audit log "Deal Finalisation Info completed."
- Does NOT change Application Progress (status) — separate field in opportunity_details
- Audit log action: `finalise_complete` with field_name: `deal_finalisation`

## Pre-Assessment Tool
- Public calculator at `/pre-assessment`
- Calculates ICR and LVR
- Saves contact info only (no financial data stored)
- Color-coded outcomes: Green/Yellow/Red

## Referrer Agreement PDF
- Download from referrer account page or admin referrer detail page
- Uses `jspdf` and `jspdf-autotable` for generation
- Content: Loanease logo (brand green #00D37F), Terms & Conditions, Schedule 3 table
- **Referrer Fees** from `global_settings.referrer_fees` (set in Terms & Conditions settings)
- Custom commission split per referrer stored in `organisation_details.commission_split`
- Shows IP address from `organisations.agreement_ip`
- Date/time displayed in Australian timezone (Australia/Sydney)

## Add Opportunity Form
- **Referrer user selection**: Auto-selects current logged-in user by default
- **ABN field**: Displayed before Entity Type/Name for ABN lookup flow
- **Form field order**: Contact info → ABN → Entity Type → Entity Name → Time in Business → Address → Industry
