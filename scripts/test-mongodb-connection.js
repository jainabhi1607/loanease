/**
 * Test MongoDB Connection
 * Run with: node scripts/test-mongodb-connection.js
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

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  console.log('🔍 MongoDB Connection Diagnostic\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Parse the connection string for display (hide password)
  const uriParts = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
  if (uriParts) {
    console.log('Connection details:');
    console.log(`  Username: ${uriParts[1]}`);
    console.log(`  Password: ${'*'.repeat(uriParts[2].length)} (${uriParts[2].length} chars)`);
    console.log(`  Cluster:  ${uriParts[3]}`);
    console.log('');
  }

  console.log('🔌 Attempting to connect...\n');

  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Connected successfully!\n');

    // Get server info
    const admin = client.db().admin();
    const serverInfo = await admin.serverInfo();
    console.log(`MongoDB Version: ${serverInfo.version}`);

    // List databases
    const dbs = await admin.listDatabases();
    console.log('\n📁 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check loanease database
    const db = client.db('loanease');
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Collections in 'loanease' database: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    await client.close();
    console.log('\n✅ Connection test passed!\n');

  } catch (error) {
    console.log('❌ Connection failed!\n');
    console.log('Error details:');
    console.log(`  Name:    ${error.name}`);
    console.log(`  Message: ${error.message}`);
    console.log(`  Code:    ${error.code || 'N/A'}`);

    if (error.message.includes('bad auth')) {
      console.log('\n🔑 AUTHENTICATION ERROR:');
      console.log('   The username or password is incorrect.');
      console.log('   Please verify your credentials in MongoDB Atlas:\n');
      console.log('   1. Go to cloud.mongodb.com');
      console.log('   2. Select your cluster "loanease"');
      console.log('   3. Click "Database Access" in left sidebar');
      console.log('   4. Find user "jainabhi1607_db_user"');
      console.log('   5. Click "Edit" and set a new password');
      console.log('   6. Update the password in .env.local\n');
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n🌐 DNS ERROR:');
      console.log('   Cannot resolve the MongoDB cluster hostname.');
      console.log('   Check your internet connection or cluster name.\n');
    }

    if (error.message.includes('ETIMEDOUT') || error.message.includes('timed out')) {
      console.log('\n⏱️ TIMEOUT ERROR:');
      console.log('   Connection timed out. Possible causes:');
      console.log('   1. IP address not whitelisted in MongoDB Atlas');
      console.log('   2. Firewall blocking the connection');
      console.log('   3. VPN interfering with connection\n');
      console.log('   To whitelist your IP:');
      console.log('   1. Go to cloud.mongodb.com');
      console.log('   2. Click "Network Access" in left sidebar');
      console.log('   3. Click "Add IP Address"');
      console.log('   4. Add 0.0.0.0/0 for development access\n');
    }

    process.exit(1);
  }
}

testConnection();
