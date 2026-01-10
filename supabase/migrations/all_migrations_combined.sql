-- Run this entire script in your Supabase SQL Editor

-- 001: Create organisations table (Australian spelling)
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  abn VARCHAR(11) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255),
  entity_type VARCHAR(100),
  address TEXT NOT NULL,
  suburb VARCHAR(100),
  state VARCHAR(10),
  postcode VARCHAR(10),
  phone VARCHAR(50),
  industry_type VARCHAR(100),
  gst_registered BOOLEAN DEFAULT false,
  commission_structure TEXT, -- JSON or text override for commission
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Create index on ABN for faster lookups
CREATE INDEX idx_organisations_abn ON public.organisations(abn);
CREATE INDEX idx_organisations_deleted_at ON public.organisations(deleted_at);

-- Add RLS (Row Level Security)
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organisations_updated_at 
  BEFORE UPDATE ON public.organisations 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Create policies for organisations
-- Clue Finance (super_admin and admin_team) can see all organisations
CREATE POLICY "Clue Finance can view all organisations" ON public.organisations
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrers can only see their own organisation
CREATE POLICY "Referrers can view own organisation" ON public.organisations
  FOR SELECT
  USING (
    auth.jwt() ->> 'organisation_id' = id::text
  );

-- Only Clue Finance can insert organisations (for now - signup will use service role)
CREATE POLICY "Clue Finance can insert organisations" ON public.organisations
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Only Clue Finance can update organisations
CREATE POLICY "Clue Finance can update organisations" ON public.organisations
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrer admins can update their own organisation details
CREATE POLICY "Referrer admins can update own organisation" ON public.organisations
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'referrer_admin' AND
    auth.jwt() ->> 'organisation_id' = id::text
  );

-- 002: Create users table (extends Supabase Auth)
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

-- 003: Create organisation_directors table for additional directors
CREATE TABLE IF NOT EXISTS public.organisation_directors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false, -- Mark the primary director
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_organisation_directors_org_id ON public.organisation_directors(organisation_id);

-- Add RLS
ALTER TABLE public.organisation_directors ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_organisation_directors_updated_at 
  BEFORE UPDATE ON public.organisation_directors 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Create policies
-- Clue Finance can view all directors
CREATE POLICY "Clue Finance can view all directors" ON public.organisation_directors
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Organisation members can view their directors
CREATE POLICY "Organisation members can view own directors" ON public.organisation_directors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organisation_id = organisation_directors.organisation_id
    )
  );

-- Clue Finance can manage directors
CREATE POLICY "Clue Finance can manage directors" ON public.organisation_directors
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin_team')
  );

-- Referrer admins can manage their organisation's directors
CREATE POLICY "Referrer admins can manage own directors" ON public.organisation_directors
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'referrer_admin' AND
    auth.jwt() ->> 'organisation_id' = organisation_id::text
  );

-- 004: Create a function to handle organisation creation
CREATE OR REPLACE FUNCTION create_organisation_with_user(
  p_company_name TEXT,
  p_trading_name TEXT,
  p_abn TEXT,
  p_address TEXT,
  p_entity_type TEXT,
  p_industry_type TEXT,
  p_phone TEXT
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  INSERT INTO public.organisations (
    company_name,
    trading_name,
    abn,
    address,
    entity_type,
    industry_type,
    phone
  ) VALUES (
    p_company_name,
    p_trading_name,
    p_abn,
    p_address,
    p_entity_type,
    p_industry_type,
    p_phone
  ) RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organisation_with_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_organisation_with_user TO service_role;