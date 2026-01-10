/**
 * Test Supabase Connection
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);
console.log('Service Key length:', supabaseServiceKey?.length);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testConnection() {
  console.log('\nTesting connection...');

  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Query error:', error.message);
    } else {
      console.log('Connection successful!');
      console.log('Data:', data);
    }
  } catch (err: any) {
    console.error('Connection failed:', err.message);
    if (err.cause) {
      console.error('Cause:', err.cause);
    }
  }
}

testConnection();
