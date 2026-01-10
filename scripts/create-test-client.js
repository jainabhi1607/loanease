// Script to create a test client directly in the database
// Run with: node scripts/create-test-client.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestClient() {
  try {
    // First, get a referrer organization
    const { data: orgs, error: orgsError } = await supabase
      .from('organisations')
      .select('id, company_name')
      .limit(1);

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return;
    }

    if (!orgs || orgs.length === 0) {
      console.error('No organizations found in database');
      return;
    }

    const orgId = orgs[0].id;
    console.log(`Using organization: ${orgs[0].company_name} (${orgId})`);

    // Get a user to set as created_by
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const userId = users[0].id;

    // Try to create a client with minimal data
    const clientData = {
      organisation_id: orgId,
      abn: '12345678901',
      entity_name: 'Test Client Company',
      contact_first_name: 'John',
      contact_last_name: 'Doe',
      contact_email: 'john.doe@test.com',
      contact_phone: '0400000000',
      created_by: userId
    };

    console.log('Attempting to create client with data:', clientData);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', JSON.stringify(clientError, null, 2));
      return;
    }

    console.log('✅ Client created successfully:', client);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestClient();
