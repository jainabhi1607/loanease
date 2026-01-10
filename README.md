# Loanease

Commercial loan referral management platform built with Next.js and Supabase.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Postmark account
- ABR API access

### Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables:
- Supabase credentials from your Supabase project
- Postmark API key
- ABR API GUID
- App URL (http://localhost:3000 for development)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build

```bash
npm run build
```

### Database Setup

Run the migrations in your Supabase project to create the required tables and RLS policies.

## Project Structure

- `/app` - Next.js App Router pages and layouts
- `/components` - React components
- `/lib` - Utility functions and configurations
- `/types` - TypeScript type definitions
- `/middleware.ts` - Authentication middleware

## Features

- Multi-tenant referrer management
- Opportunity/Application workflow
- ABN validation integration
- 2FA authentication
- Audit logging
- Email notifications via Postmark

## Security

- Row Level Security (RLS) in Supabase
- 2FA for admin users
- IP tracking and monitoring
- Audit trails for all changes
- Secure file storage