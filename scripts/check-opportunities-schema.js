// Script to check the opportunities table schema
// Run with: node scripts/check-opportunities-schema.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOpportunitiesSchema() {
  try {
    console.log('Testing opportunities table relationships...\n');

    // Test 1: Basic query
    console.log('1. Testing basic query...');
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Basic query error:', error);
      return;

      // Try creating a test opportunity to see what columns exist
      const orgId = '28fcd6ed-5c43-42d4-80bd-d0b0453dd7e4'; // SXDA PTY LTD
      const clientId = 'cf2a6e94-d692-4852-b9e9-eb7bdad2b1f8'; // HELLO CO. PTY LTD

      // Get a user ID
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1);

      if (!users || users.length === 0) {
        console.error('No users found');
        return;
      }

      const userId = users[0].id;

      console.log('\nAttempting to create test opportunity with organization_id (American spelling)...');
      const testDataAmerican = {
        organization_id: orgId,
        client_id: clientId,
        created_by: userId,
        status: 'draft',
        notes: 'Test opportunity - American spelling'
      };

      const { data: oppAmerican, error: errorAmerican } = await supabase
        .from('opportunities')
        .insert(testDataAmerican)
        .select()
        .single();

      if (errorAmerican) {
        console.error('❌ Failed with organization_id:', errorAmerican.message);

        console.log('\nAttempting to create test opportunity with organisation_id (British spelling)...');
        const testDataBritish = {
          organisation_id: orgId,
          client_id: clientId,
          created_by: userId,
          status: 'draft',
          notes: 'Test opportunity - British spelling'
        };

        const { data: oppBritish, error: errorBritish } = await supabase
          .from('opportunities')
          .insert(testDataBritish)
          .select()
          .single();

        if (errorBritish) {
          console.error('❌ Failed with organisation_id:', errorBritish.message);
        } else {
          console.log('✅ SUCCESS with organisation_id (British spelling)!');
          console.log('Created opportunity:', oppBritish);

          // Delete the test opportunity
          await supabase
            .from('opportunities')
            .delete()
            .eq('id', oppBritish.id);
          console.log('Test opportunity deleted');
        }
      } else {
        console.log('✅ SUCCESS with organization_id (American spelling)!');
        console.log('Created opportunity:', oppAmerican);

        // Delete the test opportunity
        await supabase
          .from('opportunities')
          .delete()
          .eq('id', oppAmerican.id);
        console.log('Test opportunity deleted');
      }

      return;
    }

    console.log('✅ Basic query works');
    if (opportunities && opportunities.length > 0) {
      console.log('Column names:', Object.keys(opportunities[0]));
    }

    // Test 2: Try to join with users (without hint)
    console.log('\n2. Testing join with users (no hint)...');
    const { data: withUsers1, error: error1 } = await supabase
      .from('opportunities')
      .select('id, users(*)')
      .limit(1);

    if (error1) {
      console.error('❌ Failed:', error1.message);
    } else {
      console.log('✅ Works!');
    }

    // Test 3: Try explicit foreign key hints
    console.log('\n3. Testing different foreign key hints...');
    const hints = [
      'opportunities_created_by_fkey',
      'created_by',
      'opportunities_created_by_users_fkey'
    ];

    for (const hint of hints) {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`id, users!${hint}(id, first_name, surname)`)
        .limit(1);

      if (error) {
        console.log(`❌ ${hint}: ${error.message}`);
      } else {
        console.log(`✅ ${hint}: WORKS!`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkOpportunitiesSchema();
