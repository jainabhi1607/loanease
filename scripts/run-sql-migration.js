require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local');
    console.log('\nPlease add DATABASE_URL to your .env.local file.');
    console.log('You can find this in your Supabase Dashboard under Settings > Database > Connection String');
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
    console.log('Running migration: Adding external_ref and icr columns...\n');

    const sql = `
-- Add missing opportunity fields
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS external_ref TEXT,
  ADD COLUMN IF NOT EXISTS icr DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_opportunities_external_ref
  ON opportunities(external_ref);
`;

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify the columns were added
    console.log('Verifying columns...');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'opportunities'
      AND column_name IN ('external_ref', 'icr')
      ORDER BY column_name;
    `);

    if (result.rows.length === 2) {
      console.log('✓ Verified: Both columns exist\n');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 columns, found:', result.rows.length);
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

runMigration();
