/**
 * Check and fix time_in_business column type
 * Should be TEXT/VARCHAR, not INTEGER
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndFixColumn() {
  console.log('Checking time_in_business column types...\n');

  // Check opportunities table
  const { data: oppCols, error: oppErr } = await supabase.rpc('get_column_info', {
    table_name: 'opportunities',
    column_name: 'time_in_business'
  });

  if (oppErr) {
    console.log('Could not check via RPC, trying direct query...');

    // Try to get a sample value
    const { data: sample, error: sampleErr } = await supabase
      .from('opportunities')
      .select('id, time_in_business')
      .not('time_in_business', 'is', null)
      .limit(5);

    if (sampleErr) {
      console.error('Error fetching samples:', sampleErr);
    } else {
      console.log('Sample time_in_business values from opportunities:');
      sample?.forEach(row => {
        console.log(`  ID: ${row.id}, time_in_business: ${row.time_in_business} (type: ${typeof row.time_in_business})`);
      });
    }
  } else {
    console.log('Opportunities table column info:', oppCols);
  }

  // Check opportunity_details table
  const { data: detailsSample, error: detailsErr } = await supabase
    .from('opportunity_details')
    .select('id, time_in_business')
    .not('time_in_business', 'is', null)
    .limit(5);

  if (detailsErr) {
    console.error('Error fetching opportunity_details samples:', detailsErr);
  } else {
    console.log('\nSample time_in_business values from opportunity_details:');
    detailsSample?.forEach(row => {
      console.log(`  ID: ${row.id}, time_in_business: ${row.time_in_business} (type: ${typeof row.time_in_business})`);
    });
  }

  console.log('\n--- Instructions ---');
  console.log('If the column is INTEGER and needs to be TEXT, run this SQL in Supabase SQL Editor:');
  console.log(`
-- For opportunities table:
ALTER TABLE opportunities
ALTER COLUMN time_in_business TYPE TEXT USING time_in_business::TEXT;

-- For opportunity_details table:
ALTER TABLE opportunity_details
ALTER COLUMN time_in_business TYPE TEXT USING time_in_business::TEXT;
  `);
}

checkAndFixColumn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  });
