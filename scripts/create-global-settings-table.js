const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔄 Creating global_settings table...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241120_create_global_settings_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\nVerifying table creation...');

    // Verify table exists
    const { data: tables, error: tableError } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table verification failed:', tableError.message);
      console.log('\n⚠️  Please run the migration manually in Supabase Dashboard > SQL Editor');
    } else {
      console.log('✅ Table verified successfully!');

      // Check if default settings exist
      const { data: settings, error: settingsError } = await supabase
        .from('global_settings')
        .select('setting_key');

      if (settings && settings.length > 0) {
        console.log(`\n📊 Found ${settings.length} default settings:`);
        settings.forEach(s => console.log(`   - ${s.setting_key}`));
      } else {
        console.log('\n⚠️  No default settings found. This is okay if migration INSERT failed.');
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 To run manually:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   supabase/migrations/20241120_create_global_settings_table.sql');
    console.log('4. Click "Run"');
    process.exit(1);
  }
}

runMigration();
