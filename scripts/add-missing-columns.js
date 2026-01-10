/**
 * Add missing columns to opportunities table using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addColumns() {
  console.log('Adding missing columns to opportunities table...\n');

  // Check if columns already exist
  const { data: testData, error: testError } = await supabase
    .from('opportunities')
    .select('external_ref, icr')
    .limit(1);

  if (!testError) {
    console.log('✓ Columns already exist!');
    console.log('  - external_ref: exists');
    console.log('  - icr: exists');
    return;
  }

  console.log('Columns do not exist yet. Please add them manually.\n');
  console.log('='.repeat(70));
  console.log('Go to your Supabase Dashboard and run this SQL:');
  console.log('='.repeat(70));
  console.log();
  console.log('ALTER TABLE opportunities');
  console.log('  ADD COLUMN IF NOT EXISTS external_ref TEXT,');
  console.log('  ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);');
  console.log();
  console.log('CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref');
  console.log('  ON opportunities(external_ref);');
  console.log();
  console.log('='.repeat(70));
  console.log();
  console.log('Steps:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Click "New query"');
  console.log('5. Paste the SQL above');
  console.log('6. Click "Run" (or press Ctrl+Enter)');
  console.log('7. Come back here and run this script again to verify');
  console.log();
}

addColumns()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
