require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function addReasonColumns() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local');
    console.log('\nPlease add DATABASE_URL to your .env.local file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...\n');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Run the migration SQL
    console.log('Adding declined_reason, completed_declined_reason, and withdrawn_reason columns...\n');

    const sql = `
-- Add reason fields for status changes
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;
`;

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify the columns were added
    console.log('Verifying columns...');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'opportunities'
      AND column_name IN ('declined_reason', 'completed_declined_reason', 'withdrawn_reason')
      ORDER BY column_name;
    `);

    if (result.rows.length === 3) {
      console.log('✓ Verified: All 3 columns exist\n');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log(`⚠️  Warning: Expected 3 columns, found: ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

addReasonColumns();
