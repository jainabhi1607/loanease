-- Create organisations table (Australian spelling)
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