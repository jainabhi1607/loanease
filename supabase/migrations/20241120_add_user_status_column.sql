-- Add status column to users table
-- This migration adds a status field to track active/inactive user accounts

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    -- Add the status column with default 'active'
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

    -- Add check constraint to ensure only valid values
    ALTER TABLE users ADD CONSTRAINT check_user_status
      CHECK (status IN ('active', 'inactive'));

    -- Create index for status queries
    CREATE INDEX idx_users_status ON users(status);

    -- Add comment for documentation
    COMMENT ON COLUMN users.status IS 'User account status - active users can log in, inactive users are blocked';

    RAISE NOTICE 'Status column added successfully to users table';
  ELSE
    RAISE NOTICE 'Status column already exists in users table';
  END IF;
END $$;

-- Set all existing users to active by default
UPDATE users SET status = 'active' WHERE status IS NULL;
