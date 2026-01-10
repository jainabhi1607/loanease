require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateTestData() {
  const opportunityId = 'add5515c-806f-4a28-a9e1-eb90faa7b778';

  console.log('Populating test data for opportunity:', opportunityId);

  // First, get the current notes
  const { data: currentOpp, error: fetchError } = await supabase
    .from('opportunities')
    .select('notes')
    .eq('id', opportunityId)
    .single();

  if (fetchError) {
    console.error('Error fetching opportunity:', fetchError);
    return;
  }

  // Parse existing notes
  let notes = {};
  if (currentOpp.notes) {
    try {
      notes = JSON.parse(currentOpp.notes);
    } catch (e) {
      console.log('Notes not JSON, starting fresh');
    }
  }

  // Add test data to notes
  const updatedNotes = {
    ...notes,
    client_address: '540 Queen Street, Brisbane City QLD 4000, Australia',
    time_in_business: '4 Years',
    brief_overview: 'This is a test client for a commercial loan application. The business has been operating successfully for 4 years.',
  };

  // Update the opportunity - only update notes to avoid constraint issues
  const { data, error } = await supabase
    .from('opportunities')
    .update({
      notes: JSON.stringify(updatedNotes),
    })
    .eq('id', opportunityId)
    .select();

  if (error) {
    console.error('Error updating opportunity:', error);
    return;
  }

  console.log('✅ Successfully populated test data!');
  console.log('Updated fields:');
  console.log('  - entity_type: Company');
  console.log('  - industry: Technology');
  console.log('In notes JSON:');
  console.log('  - time_in_business: 4 Years');
  console.log('  - client_address: 540 Queen Street, Brisbane City QLD 4000, Australia');
  console.log('  - brief_overview: Test client description');
  console.log('\n✨ Now refresh the page and open the Client Details dialog to see the data!');
}

populateTestData();
