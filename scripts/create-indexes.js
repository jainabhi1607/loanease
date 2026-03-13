/**
 * Script to create MongoDB indexes for optimal query performance
 *
 * Run with: node scripts/create-indexes.js
 *
 * Make sure your .env.local has:
 * - MONGODB_URI
 * - MONGODB_DB
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'loancase';

  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    const indexes = [
      // opportunity_details — most critical (used in every $lookup join)
      { collection: 'opportunity_details', index: { opportunity_id: 1 }, options: { unique: true } },

      // opportunities
      { collection: 'opportunities', index: { organization_id: 1, deleted_at: 1 } },
      { collection: 'opportunities', index: { organization_id: 1, status: 1, deleted_at: 1 } },
      { collection: 'opportunities', index: { status: 1, deleted_at: 1 } },
      { collection: 'opportunities', index: { opportunity_id: 1 }, options: { unique: true } },
      { collection: 'opportunities', index: { client_id: 1, deleted_at: 1 } },
      { collection: 'opportunities', index: { date_settled: 1 } },
      { collection: 'opportunities', index: { created_at: -1 } },

      // users
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { organisation_id: 1 } },
      { collection: 'users', index: { role: 1 } },

      // clients
      { collection: 'clients', index: { organisation_id: 1, deleted_at: 1 } },

      // audit_logs
      { collection: 'audit_logs', index: { record_id: 1, table_name: 1 } },
      { collection: 'audit_logs', index: { created_at: -1 } },

      // login_history
      { collection: 'login_history', index: { email: 1, status: 1, created_at: -1 } },

      // comments
      { collection: 'comments', index: { opportunity_id: 1 } },

      // global_settings
      { collection: 'global_settings', index: { key: 1 }, options: { unique: true } },

      // organisations
      { collection: 'organisations', index: { abn: 1 } },

      // organisation_directors
      { collection: 'organisation_directors', index: { organisation_id: 1 } },

      // compound sort index for referrer dashboard recent opportunities
      { collection: 'opportunities', index: { organization_id: 1, created_at: -1 } },

      // auth collections
      { collection: 'auth_users', index: { email: 1 }, options: { unique: true } },
      { collection: 'two_fa_codes', index: { user_id: 1, used: 1 } },
      { collection: 'user_sessions', index: { refresh_token: 1 } },
      { collection: 'user_sessions', index: { user_id: 1 } },
    ];

    for (const { collection, index, options } of indexes) {
      try {
        await db.collection(collection).createIndex(index, options || {});
        console.log(`  ✓ ${collection}: ${JSON.stringify(index)}`);
      } catch (err) {
        console.log(`  ✗ ${collection}: ${JSON.stringify(index)} — ${err.message}`);
      }
    }

    console.log('\nAll indexes created successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
