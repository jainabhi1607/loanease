# CLAUDE.md

> **Loanease**: commercial loan referral platform (referrers ↔ Loanease). Web (Next.js 14) + Mobile (Expo SDK 51). Region **India**, phone `+91`, currency `₹` / `en-IN` / `INR`.

## Stack & Commands
- **Web**: Next.js 14 App Router, React, TS, Shadcn/ui · **Mobile**: React Native / Expo Router / Zustand
- **Backend**: MongoDB, JWT + bcrypt(12), Postmark email · **Host**: Vercel
```bash
npm run dev | build | lint            # web (root, :3000)
node scripts/create-indexes.js        # MongoDB indexes
cd mobile && npx expo start           # mobile (:8081)
```

## Structure
- Web: `/app/api/{admin,referrer,auth,settings}` · `/app/(dashboard)/{admin,referrer}` · `/app/(auth)` · `/components` · `/lib/{auth,mongodb,email}` · `/types`
- Mobile: `mobile/app/{(auth),(tabs),opportunity,client}` · `mobile/lib/{api,auth,storage}.ts` · `mobile/store/auth.ts` · `mobile/constants/{config,colors}.ts`

## Auth
- JWT: access 15min (`cf_access_token`), refresh 7d/30d (`cf_refresh_token`). `cf_remember_me` extends all to 30d. `cf_2fa_verified` tracks 2FA.
- Refresh token **rotation** via `user_sessions` (web AND mobile create sessions; old token invalidated on refresh).
- **Middleware** issues a new access token from the refresh token when expired — transparent, never redirect to OTP mid-session. Missing/mismatched 2FA cookie → `/login`.
- **2FA mandatory for admins** (super_admin, admin_team) even if `two_fa_enabled=false`; verify validates code ownership via `user_id`.
- Mobile tokens: `expo-secure-store` (native) / `localStorage` (web), keys `loanease_{access,refresh}_token`, `loanease_user_data`. OTP + biometric login. 401 → refresh → retry.
- Key files: `lib/auth/{jwt,password,session}.ts`, `mobile/lib/{auth,storage}.ts`. JWT payload: `{ userId, email, role, organisationId }`.

## Database (MongoDB, string-UUID `_id`)
- Collections: users, auth_users, organisations, organisation_{directors,details}, clients, opportunities, opportunity_details, comments, audit_logs, global_settings, login_history, two_fa_codes, {email_verification,password_reset}_tokens, user_sessions, user_invitations.
- **Always cast string UUIDs**: `db.collection(X).findOne({ _id: id as any })`. Joins via `$lookup` (no FKs).
- Relations: `opportunities.client_id→clients._id`, `opportunities.organization_id→organisations._id`, `opportunity_details.opportunity_id→opportunities._id`.
- ⚠️ Spelling inconsistency: `clients.organisation_id` vs `opportunities.organization_id`.
- Roles: super_admin, admin_team, referrer_admin, referrer_team, client.
- Entity types = **INTEGER 1-6** (1 Private co, 2 Sole trader, 3 SMSF Trust, 4 Trust, 5 Partnership, 6 Individual) — `parseInt()` before store.
- Asset type: only `commercial_property | residential_property | vacant_land`. Loan purpose: SINGLE value.

## Access Control
- **super_admin**: all incl. Users + Settings · **admin_team**: all except Users/Settings · **referrer_admin**: org + user mgmt, edit ext-ref/team/notes · **referrer_team**: read-only + Profile tab only.
- Admins see all data; referrers scoped by `organisation_id`. Role **allowlists** on user create/update (no privilege escalation).
- Mobile `/api/referrer/*` GET: admins skip org filter (see all); mutations stay referrer-scoped (except note CREATE, admins allowed).

## Opportunity / Application Lifecycle
`Draft → Opportunity → Application → Settled/Declined/Withdrawn` (+ Unqualified view).
- **Decision vs Completed Declined**: both `status:'declined'`; distinguish by `completed_declined_reason` (absent=Decision ~60%, present=Completed 100%).
- **Applications (active)**: shows created/submitted/conditionally_approved/approved/completed_declined; hides `target_settlement_date` >30d old.
- **Archive** (`/admin/applications/archive`): decision_declined/settled/withdrawn + items >30d old.
- **Settlements**: menu "Settlements"; shows `date_settled` OR `deal_finalisation_status` set. Date-settled/target edits = super_admin only.

## Calculations
```
LVR = Loan / EstPropertyValue × 100
Income = NetProfit + Amort + Deprec + ExistInterest + RentalExp + ProposedRental
Interest = ExistInterest + Loan × Rate/100 ;  ICR = Income / Interest
Green: ICR≥2 & LVR≤65 · Yellow: ICR≥2 & LVR 65-80 (or concerns) · Red: ICR<1.5 or LVR>80
```
Display ICR & LVR as **plain numbers, no `%`**. Empty fields → `-`.

## Email
- ACTIVE (Postmark). From `noreply@loanease.com` / agreements `partners@loanease.com`, domain `loanease.com`.
- Postmark templates: twofactor-code, new-ip-login, password-reset, email-verification.
- DB templates in `global_settings`; signup sends 3 (welcome+creds, agreement PDF, broker alert) via `lib/email/signup-emails.ts` (`sendAllSignupEmails`, `sendNewUserWelcomeEmail`).

## Conventions & Gotchas
- `/api/auth/me` returns `{ user: {...} }` → **always** `const user = data.user || data;`.
- Currency `₹`/`en-IN`/`INR` everywhere (no `$`,`en-US`,`en-AU`,`AUD`). Country defaults `'IN'`. `parseCurrency` strips `₹` and `$`.
- Company name always **Loanease** (no "Clue"). Bundle IDs: iOS `com.loanease.referrer`, Android `com.loanease`.
- Randomness: `crypto.randomInt()` (server) / `crypto.getRandomValues()` (client) — never `Math.random()`.
- **Soft delete**: every query on clients/opportunities/organisations includes `deleted_at: null`.
- No console.log of PII/financial/OTP/passwords. Password min **10 chars**.
- JSX apostrophes → `&apos;`. Wrap `useSearchParams()` in `<Suspense>`. Next 15 route params are async (`await params`).
- Merge fix: delete `details.opportunity_id` before spreading (else UUID overwrites CF-id). Filter all-zero ABN → empty.
- PDF via `jspdf` + `autoTable(doc,{...})`; agreement PDF shows IP + IST.
- Listing pages: sort `{created_at:-1}`, paginate 20, client-side search resets to page 1.
- Mobile: entity types as ints; draft tap → edit page (not detail); dashboard action "New Lead" (not "New Referral"). Dev API base `http://192.168.1.8:3000/api`, prod `https://loanease.com/api`.
- Brand: green `#00D37F`, dark teal `#02383B`, mobile accent `#1a8cba`. Web max-width 1290px.

## Env
`MONGODB_URI`, `MONGODB_DB=loancase`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `POSTMARK_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Play Store
Finance app under **Personal Loans policy**. See `AppLive.md` for the full go-live playbook (blocked-permissions plugin, AAB build, reviewer OTP bypass, rejection clearing). ⚠️ Mobile OTP/2FA login step is currently **disabled for review** and must be re-enabled (`mobile/app/(auth)/login.tsx`).
