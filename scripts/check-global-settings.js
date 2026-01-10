const { createClient } = require('@supabase/supabase-js');

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

async function checkTable() {
  console.log('🔍 Checking global_settings table...\n');

  try {
    // Try to query the table - use explicit column names to avoid RLS issues
    const { data, error } = await supabase
      .from('global_settings')
      .select('id, setting_key, setting_value, setting_type, description, created_at')
      .limit(10);

    if (error) {
      console.error('❌ Table does not exist or cannot be accessed');
      console.error('Error:', error.message);
      console.log('\n📋 To create the table:');
      console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy the contents of: supabase/migrations/20241120_create_global_settings_table.sql');
      console.log('5. Paste into SQL Editor and click "Run"');
      process.exit(1);
    }

    console.log('✅ Table exists!');

    if (data && data.length > 0) {
      console.log(`\n📊 Found ${data.length} settings:\n`);
      data.forEach(setting => {
        console.log(`Setting: ${setting.setting_key}`);
        console.log(`  Type: ${setting.setting_type}`);
        console.log(`  Value: ${setting.setting_value ? setting.setting_value.substring(0, 50) + '...' : '(empty)'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  Table exists but contains no settings');
      console.log('You may need to run the INSERT statements from the migration file');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTable();
