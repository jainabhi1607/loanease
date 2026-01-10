const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function searchAddress() {
  console.log('Searching for address "540 Queen Street"...\n');

  // Search in opportunity_details
  const { data: details, error: detailsError } = await supabase
    .from('opportunity_details')
    .select('*, opportunities!inner(opportunity_id)')
    .or('client_address.ilike.%540 Queen%,address.ilike.%540 Queen%,street_address.ilike.%540 Queen%');

  if (detailsError) {
    console.error('Error searching opportunity_details:', detailsError);
  } else {
    console.log('Found in opportunity_details:');
    console.log(JSON.stringify(details, null, 2));
  }

  // Search in clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .ilike('address', '%540 Queen%');

  if (clientsError) {
    console.error('Error searching clients:', clientsError);
  } else {
    console.log('\nFound in clients:');
    console.log(JSON.stringify(clients, null, 2));
  }

  // Search in opportunities
  const { data: opps, error: oppsError } = await supabase
    .from('opportunities')
    .select('*')
    .or('asset_address.ilike.%540 Queen%,notes.ilike.%540 Queen%');

  if (oppsError) {
    console.error('Error searching opportunities:', oppsError);
  } else {
    console.log('\nFound in opportunities:');
    console.log(JSON.stringify(opps, null, 2));
  }
}

searchAddress();
