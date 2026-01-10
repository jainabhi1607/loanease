// Script to test which loan_purpose values work
// Run with: node scripts/test-all-loan-purposes.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoanPurposes() {
  try {
    const orgId = '28fcd6ed-5c43-42d4-80bd-d0b0453dd7e4'; // SXDA PTY LTD
    const clientId = 'cf2a6e94-d692-4852-b9e9-eb7bdad2b1f8'; // HELLO CO. PTY LTD
    const { data: users } = await supabase.from('users').select('id').eq('role', 'super_admin').limit(1);
    const userId = users[0].id;

    // Test individual values
    const testValues = [
      'purchase_owner_occupier',
      'purchase_investment',
      'refinance',
      'equity_release',
      'land_bank',
      'business_use',
      'commercial_equipment',
    ];

    console.log('Testing individual loan_purpose values:\n');

    for (const testValue of testValues) {
      const testOpp = {
        organization_id: orgId,
        client_id: clientId,
        created_by: userId,
        status: 'draft',
        notes: 'Test',
        loan_purpose: testValue
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert(testOpp)
        .select()
        .single();

      if (error) {
        console.log(`❌ "${testValue}": ${error.message}`);
      } else {
        console.log(`✅ "${testValue}": SUCCESS`);
        // Delete the test opportunity
        await supabase.from('opportunities').delete().eq('id', data.id);
      }
    }

    // Test comma-separated string (multiple values)
    console.log('\n\nTesting comma-separated values:\n');
    const combinedValue = 'purchase_owner_occupier, refinance';

    const testOpp2 = {
      organization_id: orgId,
      client_id: clientId,
      created_by: userId,
      status: 'draft',
      notes: 'Test',
      loan_purpose: combinedValue
    };

    const { data: data2, error: error2 } = await supabase
      .from('opportunities')
      .insert(testOpp2)
      .select()
      .single();

    if (error2) {
      console.log(`❌ "${combinedValue}": ${error2.message}`);
    } else {
      console.log(`✅ "${combinedValue}": SUCCESS`);
      await supabase.from('opportunities').delete().eq('id', data2.id);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testLoanPurposes();
