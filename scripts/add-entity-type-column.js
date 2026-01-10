const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addEntityTypeColumn() {
  console.log('Adding entity_type column to clients table...\n');

  // SQL to add the entity_type column
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS entity_type VARCHAR(1);

      COMMENT ON COLUMN clients.entity_type IS 'Entity type: 1=Private company, 2=Sole trader, 3=SMSF Trust, 4=Trust, 5=Partnership, 6=Individual';
    `
  });

  if (error) {
    console.error('Error adding column:', error);
    console.log('\nPlease run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log(`
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(1);

COMMENT ON COLUMN clients.entity_type IS 'Entity type: 1=Private company, 2=Sole trader, 3=SMSF Trust, 4=Trust, 5=Partnership, 6=Individual';
    `);
  } else {
    console.log('✓ Successfully added entity_type column to clients table');
  }
}

addEntityTypeColumn();
