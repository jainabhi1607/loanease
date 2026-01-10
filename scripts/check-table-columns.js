require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  console.log('Checking database table structures...\n');

  // Check comments table structure
  console.log('=== COMMENTS TABLE ===');
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('*')
    .limit(1);

  if (commentsError) {
    console.log('Error:', commentsError.message);
  } else {
    console.log('Success! Has data:', !!comments && comments.length > 0);
    if (comments && comments.length > 0) {
      console.log('Columns:', Object.keys(comments[0]).join(', '));
    }
  }

  // Check audit_logs table structure
  console.log('\n=== AUDIT_LOGS TABLE ===');
  const { data: logs, error: logsError } = await supabase
    .from('audit_logs')
    .select('*')
    .limit(1);

  if (logsError) {
    console.log('Error:', logsError.message);
  } else {
    console.log('Success! Has data:', !!logs && logs.length > 0);
    if (logs && logs.length > 0) {
      console.log('Columns:', Object.keys(logs[0]).join(', '));
    }
  }

  // Check opportunities table
  console.log('\n=== OPPORTUNITIES TABLE ===');
  const { data: opps, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, organization_id, created_by, status')
    .eq('id', '9dc06971-3154-425f-9c01-bb77b986e680')
    .single();

  if (oppsError) {
    console.log('Error:', oppsError.message);
  } else {
    console.log('Success! Opportunity exists:', !!opps);
    if (opps) {
      console.log('Data:', JSON.stringify(opps, null, 2));
    }
  }
}

checkTables().catch(console.error);
