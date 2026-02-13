# CLAUDE.md (Minimized)

> **Loanease**: Commercial loan referral platform connecting referrers with Loanease. Web app + Mobile app (Expo). Country: **India** (phone code `+91`).

## Quick Reference

### Tech Stack
- **Web Frontend**: Next.js 14 (App Router), React, TypeScript, Shadcn/ui
- **Mobile App**: React Native (Expo SDK 51), Expo Router, TypeScript, Zustand
- **Backend**: MongoDB (database), JWT + bcrypt (auth), Postmark (email)
- **Hosting**: Vercel (staging + production)

### Commands
```bash
# Web App (root)
npm install         # Install dependencies
npm run dev         # Development server (localhost:3000)
npm run build       # Production build
npm run lint        # Linting

# Mobile App (mobile/)
cd mobile
npm install         # Install dependencies
npx expo start     # Start Expo dev server (localhost:8081)
npx expo start --web   # Web preview
npx expo start --ios   # iOS simulator
npx expo start --android  # Android emulator
```

## Project Structure

### Web App
```
/app
  /api
    /admin          # Admin API (dashboard, opportunities, referrers, clients, users, settings)
    /referrer       # Referrer API (dashboard, opportunities, clients, account, unqualified)
    /auth           # Authentication (login, logout, reset-password, signup, 2fa)
    /settings       # Public settings API (terms, interest-rate)
  /(dashboard)
    /admin          # Admin portal (dashboard, opportunities, applications, settlements, referrers, clients, users, settings)
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

### Mobile App
```
/mobile
  /app                    # Expo Router screens (file-based routing)
    /(auth)              # Auth: login, signup, forgot-password, otp-verification, verify-2fa
    /(tabs)              # Tab navigation: dashboard, opportunities, applications, clients, account
    /opportunity
      /[id].tsx          # Opportunity detail (read-only for non-drafts)
      /add.tsx           # Create new opportunity (multi-step form)
      /edit/[id].tsx     # Edit draft opportunity (4-step form with progress)
    /client/[id].tsx     # Client detail
    /_layout.tsx         # Root layout (Stack navigator)
  /components
    /cards               # Card components
    /forms               # Form components
    /ui                  # Base UI (Button, Input, Card, Badge, CircularProgress)
  /lib
    /api.ts              # Fetch-based API client with JWT auth + token refresh
    /auth.ts             # Auth functions (login, OTP, 2FA, biometric, signup)
    /storage.ts          # Secure token storage (expo-secure-store / localStorage)
  /store/auth.ts         # Zustand auth state management
  /types/index.ts        # TypeScript types (mirrors web app)
  /constants
    /config.ts           # API URLs, auth config, OTP config
    /colors.ts           # Brand color palette + status colors
  /assets                # Logo, splash screen images
```

## Authentication System

### JWT-Based Auth (Web)
- **Access Token**: 15-minute expiry, stored in `cf_access_token` cookie
- **Refresh Token**: 7-day expiry, stored in `cf_refresh_token` cookie
- **2FA Cookie**: `cf_2fa_verified` cookie for 2FA session tracking
- **Password Hashing**: bcrypt with 12 rounds

### Mobile Auth
- **Token Storage**: `expo-secure-store` (native) / `localStorage` (web)
- **Token Keys**: `loanease_access_token`, `loanease_refresh_token`, `loanease_user_data`
- **OTP Login**: `POST /auth/mobile/request-otp`, `POST /auth/mobile/verify-otp`
- **Biometric**: Face ID / Touch ID via `expo-local-authentication`
- **Auto-refresh**: 401 → refresh token → retry request (with queue for concurrent requests)

### Auth Flow
1. Login → Verify password with bcrypt → Issue JWT tokens
2. 2FA (if enabled) → Verify code → Set 2FA cookie
3. Middleware checks JWT on protected routes
4. Refresh token used for silent token renewal

### Key Auth Files
- `lib/auth/jwt.ts` - JWT generation/verification using `jose` library
- `lib/auth/password.ts` - bcrypt hash/verify functions
- `lib/auth/session.ts` - Cookie management, getCurrentUserFromRequest()
- `mobile/lib/auth.ts` - Mobile auth (login, OTP, 2FA, biometric, signup)
- `mobile/lib/storage.ts` - Secure token storage abstraction

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

### Application Status Details
- **Application Created** → **Application Submitted** → **Application Decision** → **Application Completed**
- **Decision Declined** vs **Completed Declined**: Both store `status: 'declined'` in DB. Distinguished by `completed_declined_reason` field:
  - `declined` + no `completed_declined_reason` = Decision Declined (progress ~60%)
  - `declined` + has `completed_declined_reason` = Completed Declined (progress 100%)
- **Application Closed**: `deal_finalisation_status` is set on `opportunity_details`
- **Settlements page**: Shows applications with `date_settled` set OR `deal_finalisation_status` set
- **Date Settled / Target Settlement edit**: Super admin only (pencil icon + clear button)

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

## Mobile App Features

### Referrer-Only Portal
The mobile app is for referrers only (not admin). Accessed via Expo Go during development.

### Screens & Navigation
- **Tab Navigation**: Dashboard, Leads (opportunities), Apps (applications), Clients, Account
- **Dashboard**: KPI stats, loan pipeline, quick actions, recent opportunities
- **Opportunities**: Tabs for Opportunities / Drafts / Unqualified with search & FAB
- **Draft Edit**: Tapping a draft → 4-step edit form (Client → Loan → Financial → Review)
- **Opportunity Detail**: Read-only view with Overview / Notes / History tabs
- **Add Opportunity**: Multi-step create form with Save Draft / Submit

### Draft Edit Flow (`mobile/app/opportunity/edit/[id].tsx`)
- **Step 1 - Client**: Entity name, type (dropdown), contact name, email, mobile, ABN, address
- **Step 2 - Loan**: Amount, property value, loan type (dropdown), purpose, asset type (dropdown), address, overview
- **Step 3 - Financial**: Net profit, amortisation, depreciation, interest costs, rental (numeric-only with decimal), risk indicator toggles (yes/no)
- **Step 4 - Review**: Summary cards with edit shortcuts, additional notes, Save Draft / Submit
- Progress bar with tappable step circles, prev/next navigation
- Toast notifications on save/submit, navigates to listing on success
- Header: Dark teal (`#02383B`) background with centered "Edit Opportunity" + CF ID subtitle

### Mobile API Integration
- **Base URL (dev)**: `http://192.168.1.8:3000/api` (mobile) / `http://localhost:3000/api` (web)
- **Base URL (prod)**: `https://loanease.com/api`
- Uses same backend API as web app (`/api/referrer/*` endpoints)
- `GET /referrer/opportunities/{id}` - Fetch opportunity for editing
- `PATCH /referrer/opportunities/{id}` - Update draft (all fields) or non-draft (external_ref, created_by only)
- `GET /referrer/opportunities?status=draft|opportunity` - List by status
- `POST /referrer/opportunities/create` - Create new opportunity

### Mobile UI Components (`mobile/components/ui/`)
- `Button` - Primary/outline/ghost variants with loading state
- `Input` - Text input with label, error, icons; `PhoneInput` (+91 prefix); `CurrencyInput` ($ prefix)
- `Card` / `ListCard` - Content cards and tappable list items
- `Badge` / `StatusBadge` - Status badges with color mapping
- `CircularProgress` - Progress indicator

### Mobile State Management
- **Zustand** store for auth: `isAuthenticated`, `user`, `isLoading`, `initialize()`
- Token persistence via `expo-secure-store`

### Mobile Brand Colors (`mobile/constants/colors.ts`)
- Primary green: `#00D37F`, Dark teal: `#02383B`
- Status colors mapped in `StatusColors` (draft=gray, opportunity=blue, settled=green, etc.)
- Header accent: `#1a8cba` (blue teal)

## API Patterns

### `/api/auth/me` Response Structure
**IMPORTANT**: Returns `{ user: { role, first_name, surname, ... } }` - must access via `data.user`:
```typescript
const data = await response.json();
const user = data.user || data; // Always use this pattern
setUserRole(user.role);
setUserName(user.first_name || user.firstName || null);
```

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

### Mobile API Client (`mobile/lib/api.ts`)
```typescript
import { get, post, patch, del } from '../lib/api';

// Auto-attaches JWT Bearer token, handles 401 refresh
const data = await get<Opportunity[]>('/referrer/opportunities?status=draft');
await patch(`/referrer/opportunities/${id}`, payload);
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

## Admin Page Features

### Applications Page Filter
- Popover filter dropdown with 6 options: All Applications, Application Created, Application Submitted, Application Decision, Application Completed, Application Closed
- Header layout: `Applications (count) [Filter Dropdown] [Search]`
- Application Closed = `deal_finalisation_status` is set on opportunity_details

### Settlements Page (formerly "Upcoming Settlements")
- Menu item: "Settlements" (not "Upcoming Settlements")
- Shows applications with `date_settled` OR `deal_finalisation_status` set
- Filter: All, Date Settled, Closed
- API: `app/api/admin/settlements/upcoming/route.ts`

### Referrer Detail Page (`admin/referrers/[id]`)
- 3 custom tabs: Overview, Opportunities/Applications, Users
- Overview: Stats cards, two-column layout (General Info + Directors | Agreement + Commission Split)
- Users tab: Table with Name, Email, Role, Actions columns

## Common Issues & Solutions

### MongoDB Type Errors
- **"Type 'string' is not assignable to type 'ObjectId'"**: Use `as any` for string UUIDs
  ```typescript
  db.collection('users').findOne({ _id: id as any })
  ```

### JWT Payload Properties
- Use `user.userId` not `user.id`
- Use `user.organisationId` not `user.organisation_id`

### `/api/auth/me` Response
- Returns `{ user: { role, first_name, surname } }` NOT `{ role, first_name }`
- Always use `const user = data.user || data;` pattern to safely access fields
- Failing to do this hides role-based UI (e.g., super_admin Users/Settings tabs)

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

### Mobile-Specific Issues
- **Expo Go URL**: `exp://192.168.1.8:8081` (phone must be on same Wi-Fi)
- **Metro Bundler**: Runs on `localhost:8081`, config in `mobile/metro.config.js`
- **`shadow*` deprecation warning**: React Native Web warns about shadow props, use `boxShadow` for web
- **react-native-svg version**: May warn about version mismatch, fix with `npx expo install react-native-svg`
- **Platform-specific code**: Use `Platform.OS === 'ios'` for iOS-specific padding/behavior

## Development Guidelines

### Code Style
- TypeScript strict mode
- Server Components by default (web)
- Async/await over promises

### Security Best Practices
1. Never expose sensitive data in client components
2. Always validate input on both client and server
3. Implement rate limiting on public endpoints
4. Log security events in audit_logs
5. Use parameterized queries (MongoDB handles this)

### Database Operations
- **ICR and LVR**: Auto-calculated in edit dialogs, stored in DB. Display as plain numbers (no `%` sign)
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

### Email Configuration
- **From Email**: `noreply@loanease.com` (general), `partners@loanease.com` (agreements)
- **Domain**: `loanease.com`

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
4. **Shared components** - Admin and referrer views use same components (web)
5. **String UUIDs** - Always use `as any` for MongoDB _id queries
6. **JWT properties** - Use `userId` and `organisationId` (not `id` or `organisation_id`)
7. **ABN handling** - Filter out all-zeros ABN values (display as empty)
8. **PDF generation** - Use `jspdf` with `autoTable(doc, {...})` syntax
9. **Agreement PDF** - Shows IP address and Indian timezone (IST)
10. **Dashboard stats** - Never show fake/hardcoded percentage changes
11. **Mobile drafts** - Tapping draft opportunity opens edit page, not detail page
12. **Mobile API** - Same backend endpoints, different auth storage (secure store vs cookies)
13. **Entity types** - Must be sent as integers (use `parseInt()`) not strings
14. **Phone country code** - Always `+91` (India)
15. **ICR/LVR display** - Plain numbers only, no `%` sign anywhere
16. **Dashboard quick actions** - "New Lead" (not "New Referral"), Support opens Contact Us modal
17. **Referrer clients API** - Returns `opportunities_count` per client
18. **`/api/auth/me` response** - Returns `{ user: {...} }`, always use `data.user || data` pattern
19. **Decision vs Completed Declined** - Both `status: 'declined'`, use `completed_declined_reason` to distinguish
20. **Settlements** - Menu says "Settlements" (not "Upcoming Settlements"), shows date_settled OR closed
21. **Referrer detail** - 3 tabs: Overview, Opportunities/Applications, Users

## Branding & Assets

- **App Name**: Loanease
- **Logo File**: `/logo.jpg` (web), `mobile/assets/loanease_logo.png` (mobile)
- **Company Name**: Loanease (formerly Clue Commercial)
- **Email Domain**: `loanease.com`
- **PDF Agreement Party**: LOANEASE PTY LTD
- **Mobile Bundle ID**: `com.loanease.referrer`

## Referrer Portal Design

**Brand Colors**:
- Primary green: `#00D37F`
- Success badge: `#00D169`
- Dark teal (headings): `#02383B`
- Blue teal (mobile accent): `#1a8cba`
- Light green background: `#EDFFD7`
- Border gray: `#E7EBEF`

**Web Layout**:
- Max width: `1290px` with `mx-auto px-4 sm:px-6 lg:px-8`
- Header height: `85px`
- Content box padding: `40px` (`p-10`)

**Mobile Layout**:
- Tab bar: 5 tabs (Dashboard, Leads, Apps, Clients, Account)
- Edit header: Dark teal `#02383B` with white centered text
- Cards: White background, 14px border radius, subtle shadow
- Progress bar: Tappable circles with connecting lines
- Toast notifications: Animated, green (success) / red (error)
