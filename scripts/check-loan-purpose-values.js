// Script to check what loan_purpose values exist in database
// Run with: node scripts/check-loan-purpose-values.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLoanPurposeValues() {
  try {
    // Get opportunities that have loan_purpose set
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('loan_purpose')
      .not('loan_purpose', 'is', null)
      .limit(10);

    if (error) {
      console.error('Error fetching opportunities:', error);
      return;
    }

    if (opportunities && opportunities.length > 0) {
      console.log('✅ Found opportunities with loan_purpose values:\n');
      opportunities.forEach((opp, index) => {
        console.log(`${index + 1}. ${opp.loan_purpose}`);
      });
    } else {
      console.log('No opportunities found with loan_purpose values.');
      console.log('\nLet me try to create a test opportunity with a simple value...');

      // Try with a simple, common loan purpose value
      const orgId = '28fcd6ed-5c43-42d4-80bd-d0b0453dd7e4'; // SXDA PTY LTD
      const clientId = 'cf2a6e94-d692-4852-b9e9-eb7bdad2b1f8'; // HELLO CO. PTY LTD
      const { data: users } = await supabase.from('users').select('id').eq('role', 'super_admin').limit(1);
      const userId = users[0].id;

      // Try different loan_purpose values
      const testValues = [
        'purchase',
        'refinance',
        'equipment',
        'business',
        'commercial',
        'owner-occupied',
        'investment',
        null // Try without loan_purpose
      ];

      for (const testValue of testValues) {
        console.log(`\nTesting loan_purpose: "${testValue}"...`);

        const testOpp = {
          organization_id: orgId,
          client_id: clientId,
          created_by: userId,
          status: 'draft',
          notes: 'Test opportunity',
        };

        if (testValue !== null) {
          testOpp.loan_purpose = testValue;
        }

        const { data, error: testError } = await supabase
          .from('opportunities')
          .insert(testOpp)
          .select()
          .single();

        if (testError) {
          console.log(`  ❌ Failed: ${testError.message}`);
        } else {
          console.log(`  ✅ SUCCESS! This value works.`);
          // Delete the test opportunity
          await supabase.from('opportunities').delete().eq('id', data.id);
          break; // Stop after first success
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkLoanPurposeValues();
