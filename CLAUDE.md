# CLAUDE.md (Minimized)

> **Loancase**: Commercial loan referral platform connecting referrers with Loancase. Built with Next.js 14+, MongoDB, JWT Auth, Vercel.

## Quick Reference

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Shadcn/ui
- **Backend**: MongoDB (database), JWT + bcrypt (auth), Postmark (email)
- **Hosting**: Vercel (staging + production)

### Commands
```bash
npm install         # Install dependencies
npm run dev         # Development server
npm run build       # Production build
npm run lint        # Linting
```

## Project Structure

```
/app
  /api
    /admin          # Admin API (dashboard, opportunities, referrers, clients, users, settings)
    /referrer       # Referrer API (dashboard, opportunities, clients, account, unqualified)
    /auth           # Authentication (login, logout, reset-password, signup, 2fa)
    /settings       # Public settings API (terms, interest-rate)
  /(dashboard)
    /admin          # Admin portal (dashboard, opportunities, applications, referrers, clients, users, settings)
    /referrer       # Referrer portal (includes unqualified opportunities page)
  /(auth)           # Auth pages (login, reset-password, signup, register->signup redirect)
  /pre-assessment   # Public pre-assessment tool
/components         # Reusable UI components
  /opportunity      # Shared opportunity components
  /referrer         # Referrer-specific components (EditClientDialog)
  /ui               # Shadcn/ui base components
/lib
  /auth             # JWT utilities, password hashing, session management
  /mongodb          # MongoDB client and repositories
  /email            # Postmark integration + signup-emails.ts
/types              # TypeScript types
```

## Authentication System

### JWT-Based Auth
- **Access Token**: 15-minute expiry, stored in `cf_access_token` cookie
- **Refresh Token**: 7-day expiry, stored in `cf_refresh_token` cookie
- **2FA Cookie**: `cf_2fa_verified` cookie for 2FA session tracking
- **Password Hashing**: bcrypt with 12 rounds

### Auth Flow
1. Login → Verify password with bcrypt → Issue JWT tokens
2. 2FA (if enabled) → Verify code → Set 2FA cookie
3. Middleware checks JWT on protected routes
4. Refresh token used for silent token renewal

### Key Auth Files
- `lib/auth/jwt.ts` - JWT generation/verification using `jose` library
- `lib/auth/password.ts` - bcrypt hash/verify functions
- `lib/auth/session.ts` - Cookie management, getCurrentUserFromRequest()

### JWT Payload Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organisationId: string | null;
}
```

## Database (MongoDB)

### Collections
1. **users** - Users with roles: super_admin, admin_team, referrer_admin, referrer_team, client
2. **auth_users** - Auth credentials (email, password_hash, email_confirmed)
3. **organisations** - Referrer companies (ABN, commission structure, is_active, agreement_ip, agreement_date)
4. **organisation_directors** - Company directors
5. **organisation_details** - Extended org data (commission_split)
6. **clients** - Client records (scoped per referrer, entity type as INTEGER 1-6)
7. **opportunities** - Core opportunity data (status, external_ref, icr, lvr, entity_type, industry)
8. **opportunity_details** - Extended data (financials, is_unqualified, deal_finalisation_status)
9. **comments** - Opportunity notes
10. **audit_logs** - All critical changes tracked
11. **global_settings** - App-wide configs (key-value pairs)
12. **login_history** - Login attempts tracking
13. **two_fa_codes** - 2FA verification codes
14. **email_verification_tokens** - Email verification tokens
15. **password_reset_tokens** - Password reset tokens
16. **user_sessions** - Refresh token tracking
17. **user_invitations** - User invitation tokens

### MongoDB Repository Pattern
```typescript
// lib/mongodb/repositories/users.ts
export async function findUserById(id: string): Promise<User | null>
export async function findUserByEmail(email: string): Promise<User | null>
export async function createUser(data: Partial<User>): Promise<User>
export async function updateUser(id: string, data: Partial<User>): Promise<User | null>
```

### MongoDB Client
```typescript
// lib/mongodb/client.ts
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

const db = await getDatabase();
const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: id as any });
```

### Important: String UUIDs as _id
MongoDB uses ObjectId by default, but this project uses string UUIDs. Always cast to `as any`:
```typescript
// Correct
db.collection('users').findOne({ _id: id as any })
db.collection('users').find({ _id: { $in: ids as any } })

// For inserts with string _id
db.collection('users').insertOne({ _id: uuidv4() as any, ...data })
```

### Key Relationships
- `opportunities.client_id → clients._id`
- `opportunities.organization_id → organisations._id`
- `opportunity_details.opportunity_id → opportunities._id`
- Use `$lookup` aggregation for joins (no foreign key constraints in MongoDB)

### Important Constraints
- **Entity types** (INTEGER): 1=Private company, 2=Sole trader, 3=SMSF Trust, 4=Trust, 5=Partnership, 6=Individual
- **Loan purpose**: SINGLE value only (not comma-separated)
- **Asset type**: ONLY 3 values: commercial_property, residential_property, vacant_land
- **Column naming**: `clients.organisation_id` vs `opportunities.organization_id` (inconsistent spelling!)

## Key Features & Workflows

### 1. Authentication & Signup
- Email/password + 2FA (mandatory for admins, optional for referrers)
- Password minimum: 10 characters
- Password reset via email (token-based, 1-hour expiration)
- Session management via JWT, IP tracking, rate limiting
- `/register` redirects to `/signup`
- Signup stores `agreement_ip` and `agreement_date` in organisations collection
- **Signup emails** (3 emails sent on registration):
  1. Welcome email with login credentials
  2. Referrer Agreement email with PDF attachment
  3. New Broker Alert email to admin team

### 2. Opportunity Lifecycle
```
Draft → Opportunity → Application → Settled/Declined/Withdrawn
              ↓
        Unqualified (separate view)
```

### 3. User Roles & Access

**Super Admin** (`super_admin`): Full access including Users and Settings

**Administrator** (`admin_team`): All features EXCEPT Users and Settings pages

**Referrer Admin** (`referrer_admin`):
- Organization management, add/edit/delete users
- Can edit External Ref and Team Member on opportunities
- Can add/edit/delete notes on regular opportunities

**Referrer Team** (`referrer_team`):
- View opportunities, clients, applications (read-only)
- Can only access Profile tab on account page

## API Patterns

### Authentication Check
```typescript
import { getCurrentUserFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // user.userId, user.email, user.role, user.organisationId
}
```

### MongoDB Queries
```typescript
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

// Simple find
const db = await getDatabase();
const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: id as any });

// Aggregation with lookup
const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
  { $match: { organization_id: orgId, deleted_at: null } },
  { $lookup: { from: 'clients', localField: 'client_id', foreignField: '_id', as: 'client' } },
  { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
  { $sort: { created_at: -1 } }
]).toArray();
```

### Data Security
- JWT verification on all protected routes
- Referrers filtered by organisation_id
- Admins see all data
- All mutations logged in audit_logs

## Common Issues & Solutions

### MongoDB Type Errors
- **"Type 'string' is not assignable to type 'ObjectId'"**: Use `as any` for string UUIDs
  ```typescript
  db.collection('users').findOne({ _id: id as any })
  ```

### JWT Payload Properties
- Use `user.userId` not `user.id`
- Use `user.organisationId` not `user.organisation_id`

### Data Merge Issues
- **opportunity_id showing UUID instead of CF10020**: Exclude details.opportunity_id before spreading:
  ```typescript
  const details: any = oppDetails ? { ...oppDetails } : {};
  delete details.opportunity_id;
  ```

### Build Errors
- **Apostrophes in JSX**: Use `&apos;` instead of `'`
- **useSearchParams()**: Wrap in `<Suspense>` boundary
- Next.js 15 params are async - must `await params` in route handlers

## Development Guidelines

### Code Style
- TypeScript strict mode
- Server Components by default
- Async/await over promises

### Security Best Practices
1. Never expose sensitive data in client components
2. Always validate input on both client and server
3. Implement rate limiting on public endpoints
4. Log security events in audit_logs
5. Use parameterized queries (MongoDB handles this)

### Database Operations
- **ICR and LVR**: Auto-calculated in edit dialogs, stored in DB
- **Empty fields**: Display as `-` consistently
- **Soft deletes**: Use `deleted_at` field, filter with `deleted_at: null`
- **Settled loans**: Use `date_settled: { $ne: null }` to count settled loans

### Listing Page Conventions
- **Default sort**: `{ created_at: -1 }` (newest first)
- **Pagination**: 20 items per page
- **Search**: Client-side filtering with reset to page 1 on search term change

## Environment Variables
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=loancase
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
POSTMARK_API_KEY=
ABR_API_GUID=
NEXT_PUBLIC_APP_URL=
```

## Email System

### Postmark Templates
- twofactor-code (2FA), new-ip-login, password-reset, email-verification

### Database Email Templates (global_settings)
Email templates stored in `global_settings` collection with variable replacement:
- `new_signup_email_subject/content` - Welcome email
- `referrer_agreement_subject/content` - Agreement email
- `new_broker_email_subject/content` - Admin alert
- `new_user_subject/content` - Team member welcome

### Email Functions (`lib/email/signup-emails.ts`)
- `sendSignupWelcomeEmail()` - Welcome with credentials
- `sendReferrerAgreementEmail()` - Agreement PDF attachment
- `sendNewBrokerAlertEmail()` - Notify admin team
- `sendAllSignupEmails()` - Sends all 3 in parallel
- `sendNewUserWelcomeEmail()` - Team member invitation

## Key Calculations

```typescript
// LVR (Loan to Value Ratio)
LVR = (Loan Amount / Estimated Property Value) × 100

// ICR (Interest Coverage Ratio)
Total Income = Net Profit + Amortisation + Depreciation + Existing Interest + Rental Expense + Proposed Rental Income
Total Interest = Existing Interest + (Loan Amount × Interest Rate / 100)
ICR = Total Income / Total Interest

// Outcome Assessment
Green: ICR >= 2 AND LVR <= 65
Yellow: ICR >= 2 AND LVR 65-80, OR financial concerns
Red: ICR < 1.5 OR LVR > 80
```

## Important Reminders

1. **No payment processing** - Commission tracking is informational only
2. **Client uniqueness** - Clients are unique per referrer, not globally
3. **Loan purpose** - Only ONE value allowed per opportunity
4. **Shared components** - Admin and referrer views use same components
5. **String UUIDs** - Always use `as any` for MongoDB _id queries
6. **JWT properties** - Use `userId` and `organisationId` (not `id` or `organisation_id`)
7. **ABN handling** - Filter out all-zeros ABN values (display as empty)
8. **PDF generation** - Use `jspdf` with `autoTable(doc, {...})` syntax
9. **Agreement PDF** - Shows IP address and Australian timezone (AEDT/AEST)
10. **Dashboard stats** - Never show fake/hardcoded percentage changes

## Referrer Portal Design

**Brand Colors**:
- Primary green: `#00D37F`
- Success badge: `#00D169`
- Dark teal (headings): `#02383B`
- Light green background: `#EDFFD7`
- Border gray: `#E7EBEF`

**Global Layout**:
- Max width: `1290px` with `mx-auto px-4 sm:px-6 lg:px-8`
- Header height: `85px`
- Content box padding: `40px` (`p-10`)
