/**
 * Import all exported Supabase data to MongoDB Atlas
 *
 * Run with: node scripts/import-to-mongodb-atlas.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://jainabhi1607_db_user:Gxu4p1TsYJG6P7EA@loanease.qq5kchi.mongodb.net/?retryWrites=true&w=majority&appName=loanease';
const DB_NAME = 'loanease';

// Exports directory
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

// Collections to import (matching exported files)
const COLLECTIONS = [
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
  'login_history',
  'auth_users'
];

async function importToMongoDB() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('          IMPORTING DATA TO MONGODB ATLAS                   ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let client;

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('   ✅ Connected successfully!\n');

    const db = client.db(DB_NAME);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const collection of COLLECTIONS) {
      const filePath = path.join(EXPORTS_DIR, `${collection}.json`);

      // Check if export file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${collection}: No export file found`);
        results.skipped.push(collection);
        continue;
      }

      try {
        console.log(`📥 Importing ${collection}...`);

        // Read JSON file
        const jsonData = fs.readFileSync(filePath, 'utf-8');
        const documents = JSON.parse(jsonData);

        if (!documents || documents.length === 0) {
          console.log(`   ⚠️  ${collection}: No documents to import`);
          results.skipped.push(collection);
          continue;
        }

        // Drop existing collection (fresh import)
        try {
          await db.collection(collection).drop();
          console.log(`   🗑️  Dropped existing collection`);
        } catch (e) {
          // Collection might not exist, that's fine
        }

        // Insert documents
        const result = await db.collection(collection).insertMany(documents);
        console.log(`   ✅ ${collection}: ${result.insertedCount} documents imported`);
        results.success.push({ collection, count: result.insertedCount });

      } catch (error) {
        console.log(`   ❌ ${collection}: Failed - ${error.message}`);
        results.failed.push({ collection, error: error.message });
      }
    }

    // Create indexes for better query performance
    console.log('\n📇 Creating indexes...');

    try {
      // Users indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ organisation_id: 1 });
      await db.collection('users').createIndex({ role: 1 });
      console.log('   ✅ users indexes created');

      // Organisations indexes
      await db.collection('organisations').createIndex({ abn: 1 });
      await db.collection('organisations').createIndex({ is_active: 1 });
      console.log('   ✅ organisations indexes created');

      // Clients indexes
      await db.collection('clients').createIndex({ organisation_id: 1 });
      await db.collection('clients').createIndex({ entity: 1 });
      console.log('   ✅ clients indexes created');

      // Opportunities indexes
      await db.collection('opportunities').createIndex({ organization_id: 1 });
      await db.collection('opportunities').createIndex({ client_id: 1 });
      await db.collection('opportunities').createIndex({ status: 1 });
      await db.collection('opportunities').createIndex({ opportunity_id: 1 }, { unique: true });
      await db.collection('opportunities').createIndex({ created_at: -1 });
      console.log('   ✅ opportunities indexes created');

      // Opportunity details indexes
      await db.collection('opportunity_details').createIndex({ opportunity_id: 1 });
      await db.collection('opportunity_details').createIndex({ is_unqualified: 1 });
      console.log('   ✅ opportunity_details indexes created');

      // Comments indexes
      await db.collection('comments').createIndex({ opportunity_id: 1 });
      await db.collection('comments').createIndex({ user_id: 1 });
      await db.collection('comments').createIndex({ created_at: -1 });
      console.log('   ✅ comments indexes created');

      // Audit logs indexes
      await db.collection('audit_logs').createIndex({ record_id: 1 });
      await db.collection('audit_logs').createIndex({ table_name: 1 });
      await db.collection('audit_logs').createIndex({ created_at: -1 });
      console.log('   ✅ audit_logs indexes created');

      // Login history indexes
      await db.collection('login_history').createIndex({ user_id: 1 });
      await db.collection('login_history').createIndex({ email: 1 });
      await db.collection('login_history').createIndex({ created_at: -1 });
      console.log('   ✅ login_history indexes created');

      // Auth users indexes
      await db.collection('auth_users').createIndex({ email: 1 }, { unique: true });
      console.log('   ✅ auth_users indexes created');

    } catch (indexError) {
      console.log(`   ⚠️  Some indexes may have failed: ${indexError.message}`);
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      IMPORT SUMMARY                         ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Successfully imported: ${results.success.length} collections`);
    results.success.forEach(({ collection, count }) => {
      console.log(`   - ${collection}: ${count} documents`);
    });

    if (results.skipped.length > 0) {
      console.log(`\n⏭️  Skipped: ${results.skipped.length} collections`);
      results.skipped.forEach(collection => {
        console.log(`   - ${collection}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length} collections`);
      results.failed.forEach(({ collection, error }) => {
        console.log(`   - ${collection}: ${error}`);
      });
    }

    // Calculate totals
    const totalDocs = results.success.reduce((sum, { count }) => sum + count, 0);
    console.log(`\n📊 Total documents imported: ${totalDocs}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    IMPORT COMPLETE!                         ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`🌐 Database: ${DB_NAME}`);
    console.log(`📍 Cluster: loanease.qq5kchi.mongodb.net`);
    console.log('\n💡 You can view your data at: https://cloud.mongodb.com');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

importToMongoDB();
