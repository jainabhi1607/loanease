# API Routes Reference

## Admin Dashboard
```
GET /api/admin/dashboard
Returns: statistics (numberOfOpportunities, numberOfApplications, totalLoansSettledVolume,
         totalLoansSettledUnit, conversionRatio), newOpportunities[], newReferrers[], currentMonth
```

## Opportunities
```
GET    /api/admin/opportunities?status=opportunity
GET    /api/admin/opportunities?status=applications
GET    /api/admin/opportunities/unqualified
POST   /api/admin/opportunities/create
PATCH  /api/admin/opportunities/[id]
DELETE /api/admin/opportunities/[id]

GET    /api/referrer/opportunities?status=opportunity
GET    /api/referrer/opportunities/unqualified
POST   /api/referrer/opportunities/create
PATCH  /api/referrer/opportunities/[id]
  body: { external_ref: string } or { created_by: string }
```

## Opportunity Notes
```
GET    /api/admin/opportunities/[id]/notes
POST   /api/admin/opportunities/[id]/notes
PATCH  /api/admin/opportunities/[id]/notes/[noteId]
DELETE /api/admin/opportunities/[id]/notes/[noteId]

GET    /api/referrer/opportunities/[id]/notes
POST   /api/referrer/opportunities/[id]/notes
PATCH  /api/referrer/opportunities/[id]/notes/[noteId]
DELETE /api/referrer/opportunities/[id]/notes/[noteId]
```

## Opportunity History
```
GET /api/admin/opportunities/[id]/history
GET /api/referrer/opportunities/[id]/history
```

## Clients
```
PATCH /api/referrer/clients/[id]
  body: { entity, contact_first_name, contact_last_name, contact_phone, contact_email, industry, address }
```

## Users
```
GET   /api/referrer/users
  Returns: { users: [], currentUserId: string }

PATCH /api/admin/users/[id]/update
  body: { first_name, surname, role, password? }
```

## Settlements
```
GET /api/admin/settlements/upcoming
  (date_settled set OR deal_finalisation_status = 'Closed')
```

## Referrer Agreement & Commission
```
GET  /api/referrer/account/download-agreement
GET  /api/admin/referrers/[id]/download-agreement

GET  /api/referrer/account/commission-split
GET  /api/admin/referrers/[id]/commission-split
POST /api/admin/referrers/[id]/commission-split
```

## Referrer Profile
```
PATCH /api/referrer/account/update-profile
  body: { first_name, surname, email, phone, state, new_password? }
```

## Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/signup
POST /api/auth/verify-2fa
POST /api/auth/send-2fa
POST /api/auth/resend-2fa
POST /api/auth/reset-password/request
POST /api/auth/reset-password/confirm
```

## Public Settings
```
GET /api/settings/interest-rate   # Interest rate for ICR calculations
GET /api/settings/terms           # Terms and conditions for signup page
```

## Data Security
- RLS enforced at database level
- Referrers see only their organization's data (filter by organisation_id)
- Admins see all data
- All mutations logged in audit_logs

## Error Handling Patterns
```typescript
// Supabase type inference fix
type UserData = { role: string; organisation_id: string | null } | null;
const userRoleData = userData as UserData;

// For UPDATE/INSERT
await (serviceClient.from('table') as any).update(data);
```

## Common Database Errors
- **"Could not find a relationship"**: No FK between opportunities and users — fetch separately and join in code
- **"Could not find a relationship between 'comments' and 'users'"**: No FK exists — fetch notes first, then fetch user details separately using `.in('id', userIds)`
- **"violates check constraint 'check_loan_purpose'"**: Only ONE loan purpose allowed (not array)
- **"Could not find column 'organisation_id'"**: Check spelling (organisation_id vs organization_id)
- **"column clients_1.time_in_business does not exist"**: `time_in_business`, `address`, `brief_overview` are NOT on clients table — get from `opportunities` or `opportunity_details`
