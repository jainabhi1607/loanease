// Quick test to check if opportunities API works
// Run with: node scripts/test-opportunities-api.js

const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing opportunities API...\n');

    const response = await fetch('http://localhost:3001/api/admin/opportunities');
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.opportunities) {
      console.log(`\n✅ Found ${data.opportunities.length} opportunities`);
    } else if (data.error) {
      console.log(`\n❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAPI();
