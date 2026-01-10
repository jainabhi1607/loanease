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
  console.log('Testing full opportunity query for CF10025 (like admin API)...\n');

  // Query exactly like admin API
  const { data: opportunity, error: oppError } = await supabase
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
    console.error('Error fetching opportunity:', oppError);
    return;
  }

  console.log('Full opportunity data (with joins):');
  console.log(JSON.stringify(opportunity, null, 2));
}

testQuery();
