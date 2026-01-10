require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not extract project reference from Supabase URL');
    process.exit(1);
  }

  console.log('Project reference:', projectRef);
  console.log('\n⚠️  Unfortunately, the Supabase JavaScript client and REST API');
  console.log('do not support running ALTER TABLE commands directly.\n');

  console.log('You have two options:\n');

  console.log('Option 1: Run in Supabase Dashboard SQL Editor');
  console.log('=========================================');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('2. Paste this SQL:\n');
  console.log('ALTER TABLE opportunities');
  console.log('  ADD COLUMN IF NOT EXISTS external_ref TEXT,');
  console.log('  ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);');
  console.log('');
  console.log('CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref');
  console.log('  ON opportunities(external_ref);');
  console.log('');
  console.log('3. Click "Run"\n');

  console.log('Option 2: Add DATABASE_URL to .env.local');
  console.log('=========================================');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
  console.log('2. Find "Connection String" section');
  console.log('3. Copy the "URI" connection string (use "Transaction" pooler)');
  console.log('4. Add to .env.local:');
  console.log('   DATABASE_URL="your-connection-string-here"');
  console.log('5. Run: node scripts/run-sql-migration.js\n');
}

runMigration();
