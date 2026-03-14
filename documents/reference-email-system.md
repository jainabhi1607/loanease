# Email System Reference

## Email Logo & Template
- All emails use `wrapInBrandedTemplate()` in `lib/email/postmark.ts` (single place for logo/layout)
- Logo: `cluelogoapp.png` at 75px width, served from `/public/cluelogoapp.png`
- Header: dark teal (`#02383B`) background with logo
- Footer: dark teal with contact info, phone, email links

## Email Configuration
- All emails include both HTML and plain text versions for better deliverability
- Sender: `noreply@loanease.com.au` (general) or `partners@loanease.com.au` (agreements)

## Database Email Templates (global_settings)

Email templates stored in `global_settings` table with variable replacement:

| Template | Variables |
|----------|-----------|
| `new_signup_email_subject/content` | `{Name}`, `{UserName}`, `{Password}`, `{Entity Name}` |
| `referrer_agreement_subject/content` | `{Name}`, `{Entity Name}` |
| `new_broker_email_subject/content` | `{Company-Name}`, `{Director-Name}`, `{Contact-Phone}`, `{Contact-Email}`, `{ABN}`, `{Trading-Name}`, `{Address}`, `{Industry-Type}`, `{Referrer-Entity-Name}` |
| `new_broker_alert` | Recipients for admin alerts (one email per line) |
| `new_user_subject/content` | `{Name}`, `{UserName}`, `{Password}` |

## Signup Email Functions (`lib/email/signup-emails.ts`)

| Function | Purpose |
|----------|---------|
| `sendSignupWelcomeEmail()` | Welcome with credentials |
| `sendReferrerAgreementEmail()` | Agreement PDF attachment |
| `sendNewBrokerAlertEmail()` | Notify admin team |
| `sendAllSignupEmails()` | Sends all 3 in parallel |
| `sendNewUserWelcomeEmail()` | Team member invitation |

## Transactional Email Functions (`lib/email/postmark.ts`)

| Function | Purpose |
|----------|---------|
| `send2FACode()` | OTP verification code (always sent on login) |
| `sendPasswordReset()` / `sendPasswordResetEmail()` | Password reset link |
| `sendNewIPAlert()` | New IP login detection |
| `sendVerificationEmail()` | Email verification for signup |
| `sendStatusChangeEmails()` | Application status change (to client + referrer) |
| `sendOpportunityConfirmationToReferrer()` | New opportunity alert to referrer |
| `sendOpportunityConfirmationToClient()` | New opportunity alert to client |
| `sendNewOpportunityAlert()` | Admin team alert for new opportunities |
| `sendNewReferrerAlert()` | Admin alert for new referrer registration |
