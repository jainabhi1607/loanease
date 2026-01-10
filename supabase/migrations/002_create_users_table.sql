-- Create users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  organisation_id UUID REFERENCES public.organisations(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin_team', 'referrer_admin', 'referrer_team', 'client')),
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  position VARCHAR(100),
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Create indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_organisation_id ON public.users(organisation_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at);

-- Add RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Create policies for users
-- Clue Finance can view all users
CREATE POLICY "Clue Finance can view all users" ON public.users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrer admins can view users in their organisation
CREATE POLICY "Referrer admins can view organisation users" ON public.users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'referrer_admin' AND
    auth.jwt() ->> 'organisation_id' = organisation_id::text
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- Only Clue Finance can insert users (signup uses service role)
CREATE POLICY "Clue Finance can insert users" ON public.users
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrer admins can insert team members
CREATE POLICY "Referrer admins can add team members" ON public.users
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'referrer_admin' AND
    auth.jwt() ->> 'organisation_id' = organisation_id::text
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
  );

-- Clue Finance can update any user
CREATE POLICY "Clue Finance can update users" ON public.users
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrer admins can update their team members
CREATE POLICY "Referrer admins can update team members" ON public.users
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'referrer_admin' AND
    auth.jwt() ->> 'organisation_id' = organisation_id::text
  );