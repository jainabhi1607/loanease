# Loanease Code Review Findings

**Date:** 4 March 2026
**Status:** Review complete — implementation pending

---

## Critical (Fix Now)

### 0. Service Role Key Committed to Git Repository
- **File:** `.env.production` (committed to repo)
- **Issue:** The Supabase service role key is committed to the repository in plaintext. This key has full admin access to the database, bypassing all RLS policies. Anyone with repo access can see it, and it remains in git history even if deleted.
- **Fix:** Coordinate with developer to: (1) Rotate the service key in Supabase, (2) Update the new key in Vercel environment variables, (3) Delete `.env.production` from the repo, (4) Add `.env.production` to `.gitignore`. Must be done together or the live app will break.
- **Effort:** ~30 minutes (requires Supabase + Vercel admin access)

### 1. Plaintext Password Stored in Signup Flow
- **File:** `app/api/auth/signup/route.ts` (line 388)
- **Issue:** User's raw password is stored in the `email_verification_tokens` table as part of `signup_data` JSON. If the database is exposed, all pending registrants' passwords are in plaintext.
- **Fix:** Either send the welcome email at signup time (before verification), or redesign the flow to use a password-reset link on first login. Never store plaintext passwords at rest.
- **Effort:** ~1 hour

### 2. Missing Auth Check on Admin Referrer Create Route
- **File:** `app/api/admin/referrers/create/route.ts` (lines 37-44)
- **Issue:** Only checks if a `cookie` header exists — doesn't call `getUser()` or verify the caller's role. Any authenticated user could create referrer accounts. Every other admin route does this correctly.
- **Fix:** Add the standard `getUser()` + role check pattern used in all other admin routes.
- **Effort:** ~10 minutes

### 3. Race Condition in Opportunity ID Generation
- **Files:**
  - `app/api/admin/opportunities/create/route.ts` (lines 173-195)
  - `app/api/referrer/opportunities/create/route.ts` (lines 204-225)
- **Issue:** Both routes generate `CF` IDs by fetching the top 100, sorting in JavaScript, and incrementing. Two simultaneous submissions will generate the same ID. The 3-retry loop is a workaround, not a fix.
- **Fix:** Use a PostgreSQL sequence (`SELECT nextval('opportunity_id_seq')`) via a Supabase RPC function. Also extract the shared logic to a single utility file.
- **Effort:** ~1-2 hours

---

## Important (Should Fix)

### 4. Stale Database Types File
- **File:** `types/database.ts`
- **Issue:** Type definitions use wrong table names (`organizations` vs actual `organisations`, `user_profiles` vs `users`). This is the root cause of 76+ `as any` casts — TypeScript can't enforce column types because the types don't match the real schema.
- **Fix:** Regenerate with `npx supabase gen types typescript --project-id <project-id> > types/database.ts`, then progressively remove `as any` casts.
- **Effort:** ~30 minutes (regeneration), then ongoing cleanup

### 5. In-Memory Rate Limiting
- **Files:**
  - `app/api/auth/login/route.ts` (line 9)
  - `app/api/auth/signup/route.ts` (line 10)
- **Issue:** Rate limiting uses JavaScript `Map` objects. On Vercel (serverless), these reset on every cold start (~5 min inactivity). An attacker can wait out the cold start to reset counters.
- **Fix:** Use the existing `login_attempts` database table for persistent rate limiting, or use Upstash Redis.
- **Effort:** ~2-3 hours

### 6. Massive Code Duplication Across Admin/Referrer Routes
- **Issue:** Admin and referrer routes duplicate large blocks of identical code:

  | Duplicated Code | Files | Lines Each |
  |-----------------|-------|------------|
  | History formatting helpers | `api/admin/opportunities/[id]/history/route.ts`, `api/referrer/opportunities/[id]/history/route.ts` | ~400 |
  | `generateNextOpportunityId()` | Both create routes | ~25 |
  | `parseCurrency()` | Both create routes | ~10 |
  | Email dispatch block | Both create routes + both PATCH handlers | ~85 |
  | Legacy entity/industry maps | 4 route files | ~30 |
  | Currency helpers (`formatWithCommas`, `stripCurrency`) | 5+ page components | ~15 |

- **Fix:** Extract to shared utilities:
  - `lib/opportunity-history.ts` — history formatting
  - `lib/opportunity-create.ts` — ID generation, parseCurrency, email dispatch
  - `lib/legacy-mappings.ts` — entity type and industry maps
  - `lib/opportunity-utils.ts` — currency helpers (file already exists, extend it)
- **Effort:** ~3-4 hours

### 7. Dashboard Performs 5 Full Table Scans
- **File:** `app/api/admin/dashboard/route.ts` (lines 36-135)
- **Issue:** Five separate queries fetch all opportunities, then count in JavaScript. As data grows this will slow the dashboard significantly.
- **Fix:** Replace with a single PostgreSQL function (`get_dashboard_statistics()`) that returns all counts in one query.
- **Effort:** ~1-2 hours

### 8. No Pagination on Opportunities List
- **File:** `app/api/admin/opportunities/route.ts` (line 89)
- **Issue:** Returns every non-deleted opportunity with no `.limit()` or `.range()`. Will degrade as data grows.
- **Fix:** Add server-side pagination with `page` and `pageSize` query params.
- **Effort:** ~2-3 hours (backend + frontend)

### 9. getSession() Fallback in Middleware
- **File:** `middleware.ts` (lines 54-61)
- **Issue:** When `getUser()` fails (network error), middleware falls back to `getSession()` which reads the cookie without verifying the JWT against the auth server. A revoked session could still be treated as valid.
- **Fix:** Remove the fallback. If `getUser()` fails, treat the user as unauthenticated. Fail closed, not open.
- **Effort:** ~30 minutes

### 10. listUsers() Capped at 1000 in Signup
- **File:** `app/api/auth/signup/route.ts`
- **Issue:** Calls `listUsers({ page: 1, perPage: 1000 })` to check for orphaned auth users. Stops working correctly after 1000 users.
- **Fix:** Replace with `supabase.auth.admin.getUserByEmail(email)` — O(1) instead of O(n).
- **Effort:** ~15 minutes

### 11. Dead Code — service-browser.ts
- **File:** `lib/supabase/service-browser.ts`
- **Issue:** Never imported anywhere. Named "service" but uses the anon key. Misleading and unused.
- **Fix:** Delete the file.
- **Effort:** ~1 minute

---

## Minor (Nice to Have)

### 12. window.confirm() Instead of DeleteConfirmDialog
- **File:** `app/(dashboard)/admin/opportunities/[id]/page.tsx` (lines 521, 1203)
- **Issue:** Uses native `confirm()` instead of the existing `DeleteConfirmDialog` component. Inconsistent UX.
- **Fix:** Replace with `DeleteConfirmDialog`.

### 13. Dependencies That Should Be devDependencies
- **File:** `package.json`
- `pg` — only used in migration scripts, not application code
- `dotenv` — Next.js handles `.env` natively

### 14. Two PDF Libraries
- **File:** `package.json`
- Both `@react-pdf/renderer` and `jspdf` + `jspdf-autotable` are included (~400KB each). Evaluate consolidating to one.

### 15. select('*') on Audit Logs
- **File:** `app/api/admin/opportunities/[id]/history/route.ts` (line 35)
- Fetches all columns including `user_agent` which is never used. Specify needed columns only.

### 16. Oversized Page Components
- These files need breaking into smaller subcomponents:

  | File | Lines |
  |------|-------|
  | `admin/opportunities/[id]/page.tsx` | 3,344 |
  | `admin/opportunities/add/page.tsx` | 1,616 |
  | `admin/opportunities/[id]/edit/page.tsx` | 1,551 |
  | `referrer/opportunities/add/page.tsx` | 1,533 |
  | `referrer/account/page.tsx` | 1,207 |
  | `(auth)/signup/page.tsx` | 1,170 |
  | `admin/referrers/[id]/page.tsx` | 1,048 |

### 17. Console Logging in Production
- 310+ `console.log`/`console.error` statements across the codebase
- Some leak implementation details (e.g., generated opportunity IDs)
- Should be removed or gated behind `NODE_ENV === 'development'`

### 18. Migration Directory Cleanup
- Three separate migration directories: `/migration`, `/supabase/migrations`, `/database/migrations`
- Conflicting file numbering in `/supabase/migrations`
- Superseded files not removed (e.g., both `_FINAL` and original versions exist)

### 19. Hardcoded Configuration Values
- Interest rate default (8.5%) in pre-assessment
- Session refresh interval (60s) in SessionProvider
- Rate limit thresholds (5 attempts, 30 min lockout)
- Colors (#02383B) in components instead of Tailwind theme
- Should be moved to environment variables or a config file

### 20. Middleware Queries DB on Every Request
- **File:** `middleware.ts` (lines 140-149, 221-230)
- Fetches user role from database on every protected page navigation
- Could store role in JWT custom claims or encrypted cookie instead

### 21. Inconsistent API Response Formats
- Admin GET returns `{ opportunity: ... }` (wrapped)
- Referrer GET returns the object directly (unwrapped)
- Should standardise on the wrapped format

---

## Suggested Implementation Order

| Phase | Items | Focus |
|-------|-------|-------|
| **Phase 1 — Security** | #1, #2, #9 | Fix vulnerabilities |
| **Phase 2 — Correctness** | #3, #10, #5 | Fix bugs that will bite as you scale |
| **Phase 3 — Type Safety** | #4, #11 | Regenerate types, remove dead code |
| **Phase 4 — Performance** | #7, #8, #15, #20 | Database and API efficiency |
| **Phase 5 — Code Quality** | #6, #16, #17 | Reduce duplication, break up large files |
| **Phase 6 — Cleanup** | #12-14, #18-19, #21 | Polish and consistency |
