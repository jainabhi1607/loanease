# QA Status - Loanease Production Launch

**Last Updated:** 2026-02-20
**Overall Build Status:** PASSING

---

## COMPLETED FIXES

### Critical / Security Fixes
- [x] Re-enabled email sending in postmark.ts (was fully disabled with stubs)
- [x] Removed hardcoded OTP '998877' in auth.ts - restored random 6-digit generation
- [x] Removed hardcoded OTP '998877' in mobile request-otp and resend-otp routes
- [x] Removed insecure client-side `cf_2fa_verified` cookie (document.cookie line in verify-2fa page)
- [x] 2FA now mandatory for admin roles (super_admin + admin_team) even if two_fa_enabled=false
- [x] 2FA verify now validates code ownership via user_id (prevents cross-user verification)

### Currency ($ -> Rupees)
- [x] ALL `en-AU` locale -> `en-IN` across ~40+ files
- [x] ALL `AUD` currency -> `INR` across all files
- [x] ALL `$` currency prefix -> `₹` in UI (forms, exports, dashboards, cards, badges)
- [x] `$0` fallback -> `₹0` on dashboard, client detail pages
- [x] `parseCurrency` regex updated to strip `₹` in addition to `$`
- [x] Mobile app: CurrencyInput default `₹`, all formatCurrency uses `en-IN`/`INR`
- [x] PDF/CSV exports: all currency formatting uses `₹`/`en-IN`/`INR`
- [x] Pre-assessment formatCurrency fixed

### Country (Australia -> India)
- [x] Address autocomplete default country: `AU` -> `IN`, India first in dropdown
- [x] Mapbox API restricted to `country=IN` (was `country=AU`)
- [x] ALL form defaults `companyCountry`/`assetCountry`: `'AU'` -> `'IN'` (10+ files)
- [x] Australian states dropdown -> Indian states (signup, account, complete-registration, CSV export)
- [x] Phone placeholder `0400 000 000` -> `98765 43210`
- [x] Phone country code `+61` -> `+91` (mobile PhoneInput)
- [x] Australian 1300 phone numbers -> `+91 22 6200 0000` (global-settings, mobile, layout, Contact Us)
- [x] Company address fallback: Collingwood VIC -> Mumbai, Maharashtra, India
- [x] `en-AU` date locale -> `en-IN` in all date formatting
- [x] `en-AU` -> `en-IN` in signup-emails.ts PDF agreement dates
- [x] Indian states in referrer CSV export (was Australian states)

### Branding
- [x] "Clue" -> "Loanease" in T&C across all files (web + mobile)
- [x] "New Referral" -> "New Lead" on dashboard (web + mobile)
- [x] Function names `formatAustralianDateTime` -> `formatIndianDateTime`
- [x] Email key mismatch: `new_broker_alert` -> `new_referrer_alert_emails`

### Admin Opportunities
- [x] `formatLoanPurpose` fixed (wrong keys -> correct: purchase_owner_occupier, purchase_investment, refinance, equity_release, land_bank, business_use)
- [x] Client edit dialog now sends entity_name, contact_name, mobile, email to PATCH API
- [x] Client collection update in PATCH API for entity_name, contact name, phone, email
- [x] `|| '-'` fallbacks for borrowing_entity and referrer_name in opportunities list
- [x] Pagination reset when entity/date filters change
- [x] Server-side super_admin enforcement for date_settled and target_settlement_date
- [x] Withdrawn reason fallback now checks `withdrawn_reason` in addition to `reason_declined`
- [x] `useSearchParams()` wrapped in `<Suspense>` on admin detail page

### Admin Pages (General)
- [x] Referrer status reads `is_active` from org (was hardcoded "active")
- [x] Primary director included in directors list (removed `is_primary: false` filter)
- [x] Null-safe sort in clients, referrers, potential-referrers pages
- [x] Null-safe search in referrers page
- [x] Client detail API returns `abn` and `time_in_business` fields
- [x] "Upcoming Settlements" -> "Settlements" label on client detail page
- [x] Typo "aggrement" -> "agreement" in settings/terms
- [x] Settlements colSpan 8 -> 7
- [x] "Referrer Group" mislabel -> "Entity Type" on referrer detail

### Referrer Portal
- [x] Entity type string -> integer conversion in both create routes
- [x] Referrer clients page calls `/api/referrer/clients` (was calling admin API)
- [x] Created `/api/referrer/clients/export/csv` route
- [x] Status badge dynamic (was hardcoded "Opportunity")
- [x] `asset_type` added to referrer dashboard API response
- [x] Wrong description on applications page fixed
- [x] `useSearchParams()` Suspense wrapper on referrer account page

### Auth
- [x] Password min length 8 -> 10 (complete-registration page)
- [x] Indian states in complete-registration (was Australian)
- [x] verify-email redirect `/referrer` -> `/referrer/dashboard`
- [x] Login response `twoFAEnabled` true for all admin roles

### Email System
- [x] Empty template guards + fallback subjects for all 4 signup email functions
- [x] Email sending re-enabled (was fully disabled)

---

## REMAINING ITEMS (To Fix Tomorrow)

### HIGH Priority

1. **Password min length 8 -> 10 in MORE files** (Auth BUG-6)
   - `app/(auth)/signup/page.tsx` - line 362 validation, line 136 strength indicator, line 775 placeholder, line 785 UI text
   - `app/(auth)/reset-password/confirm/page.tsx` - line 45 validation, line 216 UI text
   - `app/(dashboard)/referrer/account/page.tsx` - line 287 validation

2. **Hardcoded interest rate 12.5% in add opportunity pages** (Opp BUG-12, Ref BUG-5)
   - `app/(dashboard)/admin/opportunities/add/page.tsx` - line 143
   - `app/(dashboard)/referrer/opportunities/add/page.tsx` - line 128
   - Should fetch from `/api/settings/interest-rate` (endpoint exists)

3. **Missing `as any` cast for string UUID query** (Opp BUG-10)
   - `app/api/admin/opportunities/route.ts` - line 110-114: `{ $in: userIds }` should be `{ $in: userIds as any }`
   - Without this, `referrer_name` may be empty for all opportunities

4. **Draft "Continue Editing" links to non-existent route** (Opp BUG-9)
   - `app/(dashboard)/admin/opportunities/page.tsx` - `handleEditDraft` navigates to `/admin/opportunities/${id}/edit`
   - This route does not exist for admin; needs verification or fix

5. **Login redirect for referrer role** (Auth BUG-7)
   - `app/(auth)/login/page.tsx` line 79: referrers sent to `/dashboard` instead of `/referrer/dashboard`

6. **`complete-registration` page at wrong URL path** (Auth BUG-5)
   - Currently at `(auth)/auth/complete-registration/` = URL `/auth/complete-registration`
   - Need to verify what URL invitation emails actually send

7. **Delete Client button has no onClick handler** (Admin BUG-17)
   - `app/(dashboard)/admin/clients/[id]/page.tsx` line 315

### MEDIUM Priority

8. **No frontend super_admin guard on Users/Settings pages** (Admin BUG-21, BUG-24)
   - Direct URL access to `/admin/users` or `/admin/settings` by admin_team shows empty/broken page
   - Should redirect non-super_admin users

9. **Missing status colors for `conditionally_approved` and `approved`** (Opp BUG-7)
   - `app/(dashboard)/admin/opportunities/page.tsx` - `getStatusColor` function

10. **PDF export missing "Referrer Name" column** (Opp BUG-8)
    - `app/(dashboard)/admin/opportunities/page.tsx` - PDF export omits referrer name

11. **Outcome logic incorrectly overrides to Green with partial No answers** (Opp BUG-16)
    - `app/(dashboard)/referrer/opportunities/add/page.tsx` lines 334-338
    - Same issue in admin add page

12. **Withdrawn reason dialog allows empty reason submission** (Opp BUG-25)
    - `app/(dashboard)/admin/opportunities/[id]/page.tsx` - no `disabled={!withdrawnReason.trim()}` on Submit

13. **No pagination on Potential Referrers page** (Admin BUG-41)
    - All records rendered on one page

14. **Unqualified page uses raw HTML table instead of Shadcn Table** (Admin BUG-37/38)
    - Both admin and referrer unqualified pages

15. **Commission dialog title says "Add" even when editing** (Admin BUG-10)
    - `app/(dashboard)/admin/referrers/[id]/page.tsx` line 869

16. **Debug console.log in login page and middleware** (Auth BUG-18/19)
    - `app/(auth)/login/page.tsx` lines 57-58, 75, 79
    - `middleware.ts` lines 101, 114-122

### LOW Priority

17. **Referrer Type hardcoded to "Mortgage Broker"** (Ref BUG-9)
    - `app/(dashboard)/referrer/opportunities/page.tsx` line 317

18. **Inconsistent `Private/Short Term` label formatting** (Opp BUG-14)
    - Add page: `'Private/Short Term'`, Detail page: `'Private Short Term'`, SelectItem: `"Private / Short Term"`

19. **`formatEntityType` includes invalid `public_company`** (Opp BUG-22)
    - `app/(dashboard)/admin/opportunities/[id]/page.tsx`

20. **Hardcoded "24 hours" / "1 hour" expiry text** (Auth BUG-13/14)
    - Should be dynamic from settings (but rarely changed)

21. **In-memory rate limiting won't work on Vercel serverless** (Auth BUG-16)
    - Known limitation, commented in code: "consider Redis for production"
    - Needs Redis or similar for production deployment

22. **Hardcoded fallback JWT secrets** (Auth BUG-4)
    - `middleware.ts` and `lib/auth/jwt.ts`
    - Deployment concern: ensure env vars are set

23. **No `/admin/settlements` redirect (only `/admin/settlements/upcoming` exists)** (Admin BUG-29)

24. **Default sort on Users page is name descending (Z to A)** (Admin BUG-23)

25. **`referrer_team` role has no restrictions on editing notes/ext ref** (Ref BUG-10)
    - Per spec referrer_team should be read-only; needs role check

---

## DEPLOYMENT CHECKLIST (Pre-Launch)

- [ ] Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` env vars are set (remove fallback secrets)
- [ ] Ensure `POSTMARK_API_KEY` env var is set
- [ ] Ensure `MONGODB_URI` and `MONGODB_DB` env vars are set
- [ ] Set `company_phone`, `company_address`, `company_email` in global_settings collection
- [ ] Set all email templates in global_settings (new_signup_email_subject/content, referrer_agreement_subject/content, new_broker_email_subject/content, new_user_subject/content)
- [ ] Set `new_referrer_alert_emails` in global_settings for admin alert recipients
- [ ] Consider Redis for rate limiting (currently in-memory, ineffective on Vercel)
- [ ] Verify invitation email URLs point to correct `/auth/complete-registration` path
- [ ] Remove debug console.log statements from login page and middleware
- [ ] Test all email flows end-to-end (signup, 2FA, password reset, verification)

---

## MOBILE APP STATUS

### Fixed
- [x] Currency `$` -> `₹` (dashboard, client detail, opportunity detail, CurrencyInput)
- [x] `en-AU`/`AUD` -> `en-IN`/`INR` in all formatting
- [x] PhoneInput default `+61` -> `+91`, MOBILE_REGEX updated
- [x] "New Referral" -> "New Lead" on dashboard
- [x] Entity type dropdown values corrected (string -> integer)
- [x] Contact Us phone number: 1300 -> Indian format
- [x] "Clue" -> "Loanease" in T&C terms
- [x] Support phone number updated to Indian format

### Not Yet Tested
- [ ] Full mobile QA sweep (was mentioned by user: "check all these points in mobile app also")
- [ ] Mobile draft edit flow end-to-end
- [ ] Mobile opportunity submission flow
- [ ] Mobile OTP login flow
- [ ] Mobile biometric authentication
- [ ] Mobile token refresh flow
