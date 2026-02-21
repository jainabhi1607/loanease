-- Create organisation_directors table for additional directors
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
-- Loanease can view all directors
CREATE POLICY "Loanease can view all directors" ON public.organisation_directors
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

-- Loanease can manage directors
CREATE POLICY "Loanease can manage directors" ON public.organisation_directors
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