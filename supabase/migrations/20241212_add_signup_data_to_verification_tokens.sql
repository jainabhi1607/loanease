-- Add signup_data column to store email params until verification
ALTER TABLE public.email_verification_tokens
ADD COLUMN IF NOT EXISTS signup_data JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN public.email_verification_tokens.signup_data IS 'Stores signup email params (name, company, etc.) to send welcome emails after verification';
