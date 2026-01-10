const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAllOpportunitiesForClient() {
  console.log('========== Checking ALL opportunities for client 2026c050-9e43-4051-894a-fe8eef454a47 ==========\n');

  // Get all opportunities for this client
  const { data: opportunities, error } = await serviceClient
    .from('opportunities')
    .select('id, opportunity_id, status, entity_type, industry, time_in_business, abn')
    .eq('client_id', '2026c050-9e43-4051-894a-fe8eef454a47')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${opportunities.length} opportunities for this client:\n`);

  for (const opp of opportunities) {
    console.log(`--- ${opp.opportunity_id} (${opp.id}) ---`);
    console.log('Status:', opp.status);
    console.log('entity_type:', opp.entity_type);
    console.log('industry:', opp.industry);
    console.log('time_in_business:', opp.time_in_business);
    console.log('abn:', opp.abn);

    // Get opportunity_details for this opportunity
    const { data: details } = await serviceClient
      .from('opportunity_details')
      .select('client_address, time_in_business, brief_overview')
      .eq('opportunity_id', opp.id)
      .single();

    if (details) {
      console.log('details.client_address:', details.client_address);
      console.log('details.time_in_business:', details.time_in_business);
      console.log('details.brief_overview:', details.brief_overview);
    } else {
      console.log('No opportunity_details record');
    }
    console.log('');
  }
}

checkAllOpportunitiesForClient();
