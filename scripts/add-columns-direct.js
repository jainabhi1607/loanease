require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function addColumns() {
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

  console.log('Attempting to add external_ref and icr columns...\n');

  // Test if we can query the table first
  const { data: testQuery, error: testError } = await supabase
    .from('opportunities')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('Cannot connect to opportunities table:', testError.message);
    process.exit(1);
  }

  console.log('✓ Connected to database\n');

  // Try to select the new columns to test if they exist
  console.log('Testing if columns already exist...');
  const { data: colTest, error: colError } = await supabase
    .from('opportunities')
    .select('external_ref, icr')
    .limit(1);

  if (!colError) {
    console.log('✅ Columns external_ref and icr already exist!');
    console.log('No migration needed.\n');
    process.exit(0);
  }

  // Columns don't exist, need to add them
  console.log('\n❌ Columns do not exist.');
  console.log('\nSupabase JS client cannot run ALTER TABLE directly.');
  console.log('You need to run the migration in Supabase Dashboard:\n');
  console.log('================================================================================');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor" in sidebar');
  console.log('4. Click "New query"');
  console.log('5. Copy and paste this SQL:\n');
  console.log('-- Add missing opportunity fields');
  console.log('ALTER TABLE opportunities');
  console.log('  ADD COLUMN IF NOT EXISTS external_ref TEXT,');
  console.log('  ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);\n');
  console.log('CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref');
  console.log('  ON opportunities(external_ref);\n');
  console.log('6. Click "Run" or press Ctrl+Enter');
  console.log('================================================================================\n');

  console.log('Or run this file from the SQL Editor:');
  console.log('  supabase/migrations/20241213_add_missing_opportunity_fields.sql\n');
}

addColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
