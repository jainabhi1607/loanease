require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkStatusEnum() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check enum values for opportunity_status
    const result = await client.query(`
      SELECT unnest(enum_range(NULL::opportunity_status))::text AS status
      ORDER BY status;
    `);

    console.log('Valid opportunity_status values:');
    console.log('================================');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStatusEnum();
