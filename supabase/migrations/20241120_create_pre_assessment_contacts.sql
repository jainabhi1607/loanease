-- Create pre_assessment_contacts table
CREATE TABLE IF NOT EXISTS pre_assessment_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pre_assessment_contacts_email ON pre_assessment_contacts(email);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_contacts_created_at ON pre_assessment_contacts(created_at DESC);

-- Add RLS policies
ALTER TABLE pre_assessment_contacts ENABLE ROW LEVEL SECURITY;

-- Only super_admin and admin_team can view pre-assessment contacts
CREATE POLICY "Admin can view pre-assessment contacts"
  ON pre_assessment_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin_team')
    )
  );

-- Add comment
COMMENT ON TABLE pre_assessment_contacts IS 'Stores contact information from pre-assessment tool submissions';
