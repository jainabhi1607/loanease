// Script to check valid organisations in the database
// Run with: node scripts/check-valid-orgs.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkValidOrgs() {
  try {
    // Get all valid organisations
    const { data: orgs, error: orgsError } = await supabase
      .from('organisations')
      .select('id, company_name, abn')
      .is('deleted_at', null);

    if (orgsError) {
      console.error('Error fetching organisations:', orgsError);
      return;
    }

    console.log(`\n✅ Found ${orgs.length} valid organisations:\n`);
    orgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.company_name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   ABN: ${org.abn}\n`);
    });

    // Check if any clients exist
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, entity_name, organisation_id, contact_first_name, contact_last_name')
      .is('deleted_at', null);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return;
    }

    console.log(`\n✅ Found ${clients.length} existing clients:\n`);
    clients.forEach((client, index) => {
      const org = orgs.find(o => o.id === client.organisation_id);
      console.log(`${index + 1}. ${client.entity_name || `${client.contact_first_name} ${client.contact_last_name}`}`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Organisation: ${org ? org.company_name : 'Unknown'}\n`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkValidOrgs();
