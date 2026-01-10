const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testQuery() {
  console.log('Testing opportunity query for CF10025...\n');

  // First, get the UUID for CF10025
  const { data: opp, error: oppError } = await supabase
    .from('opportunities')
    .select('id, opportunity_id, entity_type, industry, asset_type, loan_amount, icr, lvr, abn, time_in_business')
    .eq('opportunity_id', 'CF10025')
    .single();

  if (oppError) {
    console.error('Error fetching opportunity:', oppError);
    return;
  }

  console.log('Opportunity data from opportunities table:');
  console.log(JSON.stringify(opp, null, 2));
  console.log('\n');

  // Now fetch opportunity_details using the UUID
  const { data: details, error: detailsError } = await supabase
    .from('opportunity_details')
    .select('*')
    .eq('opportunity_id', opp.id)
    .single();

  if (detailsError) {
    console.error('Error fetching opportunity details:', detailsError);
  } else {
    console.log('Opportunity details from opportunity_details table:');
    console.log(JSON.stringify(details, null, 2));
  }
}

testQuery();
