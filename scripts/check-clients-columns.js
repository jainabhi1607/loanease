const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkClientsColumns() {
  console.log('Checking clients table structure...\n');

  // Fetch one client to see what columns exist
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching client:', error);
    return;
  }

  if (clients && clients.length > 0) {
    console.log('Available columns in clients table:');
    console.log(Object.keys(clients[0]));
    console.log('\nSample client data:');
    console.log(JSON.stringify(clients[0], null, 2));
  } else {
    console.log('No clients found in database');
  }
}

checkClientsColumns();
