const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testReferrerAPILogic(opportunityId) {
  console.log(`\n========== Testing Referrer API Logic for ${opportunityId} ==========\n`);

  // Simulate what the referrer API does
  const { data: opportunity, error: oppError } = await serviceClient
    .from('opportunities')
    .select(`
      *,
      clients!opportunities_client_id_fkey (
        id,
        entity_name,
        contact_first_name,
        contact_last_name,
        contact_phone,
        contact_email,
        abn
      ),
      organisations!opportunities_organization_id_fkey (
        id,
        company_name
      )
    `)
    .eq('id', opportunityId)
    .single();

  if (oppError || !opportunity) {
    console.error('Error fetching opportunity:', oppError);
    return;
  }

  const opp = opportunity;

  // Fetch opportunity details
  const { data: oppDetails, error: detailsError } = await serviceClient
    .from('opportunity_details')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .single();

  const details = oppDetails || {};

  console.log('Raw opportunity data:');
  console.log('  entity_type:', opp.entity_type);
  console.log('  industry:', opp.industry);
  console.log('  asset_type:', opp.asset_type);
  console.log('  loan_amount:', opp.loan_amount);
  console.log('  icr:', opp.icr);
  console.log('  lvr:', opp.lvr);
  console.log('  abn (opp):', opp.abn);
  console.log('  time_in_business (opp):', opp.time_in_business);

  console.log('\nRaw details data:');
  console.log('  client_address:', details.client_address);
  console.log('  time_in_business:', details.time_in_business);
  console.log('  brief_overview:', details.brief_overview);

  console.log('\nClient data:');
  console.log('  entity_name:', opp.clients?.entity_name);
  console.log('  abn:', opp.clients?.abn);
  console.log('  contact_first_name:', opp.clients?.contact_first_name);
  console.log('  contact_last_name:', opp.clients?.contact_last_name);

  // Apply referrer API transformation logic
  const client_time_in_business = opp.time_in_business || details.time_in_business || '';
  const client_address = details.client_address || '';
  const client_abn = (opp.clients?.abn && opp.clients.abn.replace(/0/g, '') !== '')
    ? opp.clients.abn
    : (opp.abn && opp.abn.replace(/0/g, '') !== '')
    ? opp.abn
    : '';

  console.log('\n  Transformed values:');
  console.log('  client_time_in_business:', client_time_in_business);
  console.log('  client_address:', client_address);
  console.log('  client_abn:', client_abn);
  console.log('  client_entity_type:', opp.entity_type || '');
  console.log('  loan_asset_type:', opp.asset_type || '');
  console.log('  loan_amount:', opp.loan_amount || 0);
  console.log('  icr:', opp.icr || 0);
  console.log('  lvr:', opp.lvr || 0);
}

// Test both CF10020 and CF10025
async function runTests() {
  await testReferrerAPILogic('add5515c-806f-4a28-a9e1-eb90faa7b778'); // CF10020
  await testReferrerAPILogic('fa152694-daf5-4f5e-bb8c-3b2f4613c2d4'); // CF10025
}

runTests();
