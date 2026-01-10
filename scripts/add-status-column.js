const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addStatusColumn() {
  console.log('Adding status column to users table...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Add status column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'status'
        ) THEN
          ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

          -- Add check constraint
          ALTER TABLE users ADD CONSTRAINT check_user_status
            CHECK (status IN ('active', 'inactive'));

          -- Create index for status
          CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

          COMMENT ON COLUMN users.status IS 'User account status - active or inactive';
        END IF;
      END $$;
    `
  });

  if (error) {
    console.error('Error adding status column:', error);
    process.exit(1);
  }

  console.log('✓ Status column added successfully');
}

addStatusColumn();
