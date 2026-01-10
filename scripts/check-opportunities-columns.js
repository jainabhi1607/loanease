/**
 * Check what columns exist in opportunities table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkColumns() {
  console.log('Checking opportunities table structure...\n');

  // Query to get table columns
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Columns in opportunities table:');
    console.log('================================');
    columns.sort().forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });
    console.log(`\nTotal: ${columns.length} columns`);

    // Check for specific fields
    console.log('\n\nChecking for specific fields:');
    console.log('============================');
    const fieldsToCheck = [
      'external_ref',
      'net_profit',
      'amortisation',
      'depreciation',
      'existing_interest',
      'rental_expense',
      'proposed_rental_income',
      'icr',
      'lvr'
    ];

    fieldsToCheck.forEach(field => {
      const exists = columns.includes(field);
      console.log(`${field}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });
  } else {
    console.log('No opportunities found in the table.');
  }
}

checkColumns()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  });
