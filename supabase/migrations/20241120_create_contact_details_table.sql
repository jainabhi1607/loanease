-- Create contact_details table for Pre-Assessment Tool
-- Stores contact information from public users who use the pre-assessment calculator

CREATE TABLE IF NOT EXISTS contact_details (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(150),
  last_name VARCHAR(150),
  email VARCHAR(200),
  phone VARCHAR(100),
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_contact_details_email ON contact_details(email);

-- Create index on date_time for filtering by date
CREATE INDEX IF NOT EXISTS idx_contact_details_date_time ON contact_details(date_time);

-- Add comment
COMMENT ON TABLE contact_details IS 'Stores contact information from users who complete the pre-assessment tool without being logged in';
