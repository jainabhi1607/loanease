/**
 * Run migration to add missing opportunity fields
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('Running migration: add missing opportunity fields...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241213_add_missing_opportunity_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split SQL statements by semicolon and execute one by one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 80)}...`);

    const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      // Try alternative method using raw SQL
      console.log('Trying alternative execution method...');

      // For ALTER TABLE commands, we can try using Supabase's SQL editor approach
      // Since we don't have direct SQL execution, we'll log instructions
      console.error('\n⚠️  Cannot execute SQL directly via Supabase client.');
      console.error('Please run this migration manually in Supabase Dashboard:');
      console.error('\n1. Go to Supabase Dashboard > SQL Editor');
      console.error('2. Paste and run the following SQL:\n');
      console.error(sql);
      console.error('\n');
      return;
    }

    console.log('✓ Executed successfully\n');
  }

  console.log('✅ Migration completed successfully!');
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error:', err);
    console.error('\nPlease run the migration manually in Supabase Dashboard.');
    process.exit(1);
  });
