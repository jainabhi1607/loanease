-- Create login_history table to track all user login attempts
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_created ON login_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can view all login history
CREATE POLICY "Super admins can view all login history"
  ON login_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON login_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert login history
CREATE POLICY "Service role can insert login history"
  ON login_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE login_history IS 'Tracks all user login attempts including successful logins, failed attempts, and blocked logins';
COMMENT ON COLUMN login_history.status IS 'Login attempt status: success, failed, or blocked';
COMMENT ON COLUMN login_history.failure_reason IS 'Reason for failed login: invalid_credentials, account_inactive, account_blocked, etc.';
