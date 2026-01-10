require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEntityTypes() {
  // Get all unique entity_type values that are currently in the database
  const { data, error } = await supabase
    .from('opportunities')
    .select('entity_type')
    .not('entity_type', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueTypes = [...new Set(data.map(o => o.entity_type))];
  console.log('Valid entity_type values found in database:');
  uniqueTypes.forEach(type => {
    console.log(`  - ${type}`);
  });
}

checkEntityTypes();
