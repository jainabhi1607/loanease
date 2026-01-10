/**
 * Import exported Supabase data into MongoDB
 *
 * Run with: node scripts/import-to-mongodb.js
 *
 * Prerequisites:
 * - MongoDB connection string in .env.local as MONGODB_URI
 * - Exported JSON files in /exports folder
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const eqIndex = trimmedLine.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmedLine.substring(0, eqIndex).trim();
        const value = trimmedLine.substring(eqIndex + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

// MongoDB connection - use environment variable or fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jainabhi1607_db_user:Gxu4p1TsYJG6P7EA@loanease.qq5kchi.mongodb.net/loanease?retryWrites=true&w=majority';
const MONGODB_DB = process.env.MONGODB_DB || 'loanease';

// Exports directory
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

// Collections to import (in order for referential integrity)
const COLLECTIONS = [
  'auth_users',
  'users',
  'organisations',
  'organisation_directors',
  'clients',
  'opportunities',
  'opportunity_details',
  'comments',
  'audit_logs',
  'global_settings',
  'email_verification_tokens',
  'login_history'
];

// Index definitions for better query performance
const INDEXES = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { organisation_id: 1 } },
    { key: { role: 1 } },
    { key: { created_at: -1 } }
  ],
  organisations: [
    { key: { abn: 1 } },
    { key: { is_active: 1 } },
    { key: { created_at: -1 } }
  ],
  organisation_directors: [
    { key: { organisation_id: 1 } }
  ],
  clients: [
    { key: { organisation_id: 1 } },
    { key: { contact_email: 1 } },
    { key: { created_at: -1 } }
  ],
  opportunities: [
    { key: { organization_id: 1 } },
    { key: { client_id: 1 } },
    { key: { status: 1 } },
    { key: { opportunity_id: 1 } },
    { key: { created_at: -1 } }
  ],
  opportunity_details: [
    { key: { opportunity_id: 1 }, unique: true }
  ],
  comments: [
    { key: { opportunity_id: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } }
  ],
  audit_logs: [
    { key: { record_id: 1 } },
    { key: { table_name: 1 } },
    { key: { user_id: 1 } },
    { key: { created_at: -1 } }
  ],
  login_history: [
    { key: { user_id: 1 } },
    { key: { email: 1 } },
    { key: { created_at: -1 } }
  ],
  auth_users: [
    { key: { email: 1 }, unique: true }
  ]
};

async function importData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           IMPORTING DATA INTO MONGODB                      ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let client;

  try {
    console.log('🔌 Connecting to MongoDB...');
    client = await MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('   ✅ Connected successfully!\n');

    const db = client.db(MONGODB_DB);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Import each collection
    for (const collectionName of COLLECTIONS) {
      const filePath = path.join(EXPORTS_DIR, `${collectionName}.json`);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${collectionName}: File not found`);
        results.skipped.push(collectionName);
        continue;
      }

      try {
        console.log(`📥 Importing ${collectionName}...`);

        // Read the JSON file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (!Array.isArray(data) || data.length === 0) {
          console.log(`   ⚠️  ${collectionName}: No data to import`);
          results.skipped.push(collectionName);
          continue;
        }

        // Drop existing collection and create fresh
        const collection = db.collection(collectionName);

        try {
          await collection.drop();
          console.log(`   🗑️  Dropped existing collection`);
        } catch (e) {
          // Collection might not exist, that's fine
        }

        // Insert all documents
        const result = await collection.insertMany(data, { ordered: false });
        console.log(`   ✅ Imported ${result.insertedCount} documents`);

        // Create indexes if defined
        if (INDEXES[collectionName]) {
          console.log(`   📇 Creating indexes...`);
          for (const indexSpec of INDEXES[collectionName]) {
            try {
              await collection.createIndex(indexSpec.key, {
                unique: indexSpec.unique || false,
                background: true
              });
            } catch (indexError) {
              console.log(`   ⚠️  Index creation warning: ${indexError.message}`);
            }
          }
          console.log(`   ✅ Indexes created`);
        }

        results.success.push({ name: collectionName, count: result.insertedCount });

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results.failed.push({ name: collectionName, error: error.message });
      }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      IMPORT SUMMARY                         ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Successfully imported: ${results.success.length} collections`);
    results.success.forEach(({ name, count }) => {
      console.log(`   - ${name}: ${count} documents`);
    });

    if (results.skipped.length > 0) {
      console.log(`\n⚠️  Skipped: ${results.skipped.length} collections`);
      results.skipped.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length} collections`);
      results.failed.forEach(({ name, error }) => {
        console.log(`   - ${name}: ${error}`);
      });
    }

    // List all collections in the database
    console.log('\n📊 Collections in database:');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    IMPORT COMPLETE!                         ');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed\n');
    }
  }
}

// Run the import
importData();
