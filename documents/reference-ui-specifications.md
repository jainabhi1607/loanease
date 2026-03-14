# UI Specifications & Brand Guidelines

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary green | `#00D37F` | Buttons, links, accents |
| Success badge | `#00D169` | Status badges |
| Dark teal | `#02383B` | Headings, text, header/footer backgrounds |
| Light green bg | `#EDFFD7` | Card backgrounds |
| Login history bg | `#ecfed6` | Login history container |
| Border gray | `#E7EBEF` | Card borders |
| Text gray | `#787274` | Secondary text |

## Referrer Portal Design Specifications

### Global Layout
- Max width: `1290px` with `mx-auto px-4 sm:px-6 lg:px-8`
- Header height: `85px`
- Page top margin: `75px` (except dashboard/home pages)
- Page background: `white`
- Content box padding: `40px` (`p-10`)

### Client Detail Page (`/referrer/clients/[id]`)
- **Client Details card**: `bg-[#EDFFD7]`, `p-10`, `rounded-lg`
- **Opportunities table**: `bg-[#EDFFD7]`, `p-10`, `rounded-lg`
- **Total Finance Amount card**: `bg-[#02383B]`, `p-10`, white text
- **Upcoming Settlements card**: `bg-white`, `p-10`, `border border-[#E7EBEF]`

### Account Page (`/referrer/account`)
- Tabs: Account, Profile, Team Management, Login History (Team Members see only Profile tab)
- Tab style: Simple underline with `border-b-2 border-[#02383B]` for active
- **General Information card**: `bg-white border border-[#E7EBEF]`, dividers between rows
- **Commission Split & Directors cards**: `bg-[#EDFFD7]`
- **Referral Agreement & Users cards**: `bg-white border border-[#E7EBEF]`
- Active badge: `bg-[#00D37F]`
- Team Member badge: `bg-[#EDFFD7] text-[#02383B]`
- Edit icon: square-pen SVG
- Usernames: bold

### Profile Tab (`/referrer/account?tab=profile`)
- Card style: `bg-white border border-[#E7EBEF] rounded-lg p-10`
- Profile header: User initials circle, name, email, role badge
- Form fields (2 columns): First Name | Last Name, Email Address | Phone Number, State (dropdown)
- Password section: "Change Password" link toggles password fields
- Password fields (2 columns): New Password | Repeat New Password (green labels `#00D37F`)
- Role badges: Account Owner (`#023838`), Admin (`#00D169`), Team Member (`#7161F2`)
- Header initials circle in layout links to Profile tab

### Login History Tab
- Container: `bg-[#ecfed6]`, `p-10`, `rounded-lg`
- Table borders: `border-[#c8e6c9]`
- Date & Time, Email columns: `font-bold text-[#02383B]`
- Status badges: Success (`#00D169`), Failed (`red-500`), Blocked (`orange-500`) — all white text
- Filters button with popover checkboxes
- Query includes failed attempts where `user_id` is null (matches by email)

## Key Components

### Shared Opportunity Components (`/components/opportunity/`)
- OpportunityClientDetails.tsx
- OpportunityLoanDetails.tsx
- OpportunityFinancialDetails.tsx
- OpportunitySidebar.tsx

### Reusable Form Components
- ClientFundingRequirements.tsx (loan + financial fields)
- OtherQuestions.tsx (5 Yes/No questions)
- EditClientDialog.tsx (admin — entity type, contact info)
- /components/referrer/EditClientDialog.tsx (referrer — includes industry, address)
- EditUserDialog.tsx (admin referrer detail — edit user name, role, password)
- DeleteConfirmDialog.tsx (styled AlertDialog for delete confirmations with warning icon)

### Rich Text Editor (`/components/RichTextEditor.tsx`)
- TipTap-based with Bold, Italic, Headings, Bullet/Ordered Lists, Undo/Redo
- Used for: Terms & Conditions settings, Commission Split settings

### Formatting Utilities (`/lib/opportunity-utils.ts`)
- formatCurrency, formatDate, formatEntityType, formatAssetType, formatIndustry, formatLoanType, formatLoanPurpose, formatStatusDisplay, getStatusColor

### Pagination Component (`/components/ui/pagination.tsx`)
- Reusable pagination with sliding window (3 page numbers visible)
- Previous/Next buttons, first/last page shortcuts
- Shows "Showing X to Y of Z results"
- Used on all listing pages (20 items per page, descending order by default)

## UI Conventions

- **No horizontal scrollbars**: Never use `overflow-x-auto` on table containers or any page element
- **Tables**: Use `w-full` tables that fit within the max-width container naturally
- **Timezone**: ALL date/time formatting MUST use `timeZone: 'Australia/Sydney'`
- **Locale**: Always use `'en-AU'` locale for dates and currency (never `en-GB` or `en-US`)
- **Empty fields**: Display as `-` consistently across admin and referrer views
- **Password minimum**: 10 characters everywhere (frontend validation, API validation, UI text, placeholders)

## Listing Page Conventions

- **Default sort**: All listing pages sort by `created_at` descending (newest first)
- **Pagination**: 20 items per page using `Pagination` component
- **Sortable columns**: Use `SortableTableHead` component for clickable column headers
- **Search**: Client-side filtering with reset to page 1 on search term change
- **Pages with pagination**: Admin (opportunities, applications, clients, referrers, users, unqualified) and Referrer (opportunities, applications, clients, unqualified)
