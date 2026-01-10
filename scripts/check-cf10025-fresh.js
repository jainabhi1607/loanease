const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCF10025() {
  console.log('========== Checking Current Data for CF10025 ==========\n');

  // Fetch opportunity with all joins (exactly like admin API)
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
    .eq('opportunity_id', 'CF10025')
    .single();

  if (oppError) {
    console.error('Error:', oppError);
    return;
  }

  console.log('=== OPPORTUNITIES TABLE DATA ===');
  console.log('ID:', opportunity.id);
  console.log('Opportunity ID:', opportunity.opportunity_id);
  console.log('Status:', opportunity.status);
  console.log('entity_type:', opportunity.entity_type);
  console.log('industry:', opportunity.industry);
  console.log('asset_type:', opportunity.asset_type);
  console.log('loan_amount:', opportunity.loan_amount);
  console.log('property_value:', opportunity.property_value);
  console.log('loan_type:', opportunity.loan_type);
  console.log('loan_purpose:', opportunity.loan_purpose);
  console.log('icr:', opportunity.icr);
  console.log('lvr:', opportunity.lvr);
  console.log('abn:', opportunity.abn);
  console.log('time_in_business:', opportunity.time_in_business);
  console.log('asset_address:', opportunity.asset_address);

  console.log('\n=== CLIENT DATA ===');
  console.log('Client ID:', opportunity.clients?.id);
  console.log('Entity Name:', opportunity.clients?.entity_name);
  console.log('Contact:', opportunity.clients?.contact_first_name, opportunity.clients?.contact_last_name);
  console.log('ABN:', opportunity.clients?.abn);

  // Fetch opportunity_details
  const { data: details, error: detailsError } = await serviceClient
    .from('opportunity_details')
    .select('*')
    .eq('opportunity_id', opportunity.id)
    .single();

  console.log('\n=== OPPORTUNITY_DETAILS TABLE DATA ===');
  if (detailsError) {
    console.log('Error fetching details:', detailsError.message);
  } else if (details) {
    console.log('client_address:', details.client_address);
    console.log('time_in_business:', details.time_in_business);
    console.log('brief_overview:', details.brief_overview);
    console.log('address:', details.address);
    console.log('street_address:', details.street_address);
    console.log('city:', details.city);
    console.log('state:', details.state);
    console.log('postcode:', details.postcode);
    console.log('net_profit:', details.net_profit);
    console.log('rental_income:', details.rental_income);
  } else {
    console.log('No opportunity_details record found');
  }
}

checkCF10025();
