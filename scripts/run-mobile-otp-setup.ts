/**
 * Run Mobile OTP Database Setup
 *
 * Execute with: npx ts-node scripts/run-mobile-otp-setup.ts
 * Or: npx tsx scripts/run-mobile-otp-setup.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'loanease';

async function setup() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected successfully!\n');

    const db = client.db(MONGODB_DB);

    // 1. Create mobile_otp_codes collection
    console.log('1. Creating mobile_otp_codes collection...');
    try {
      await db.createCollection('mobile_otp_codes');
      console.log('   Created mobile_otp_codes collection');
    } catch (e: any) {
      if (e.code === 48) { // Collection already exists
        console.log('   Collection mobile_otp_codes already exists');
      } else {
        throw e;
      }
    }

    // 2. Create indexes for mobile_otp_codes
    console.log('2. Creating indexes for mobile_otp_codes...');
    const otpCollection = db.collection('mobile_otp_codes');

    await otpCollection.createIndex({ mobile: 1, expires_at: 1 });
    console.log('   Created index: mobile + expires_at');

    await otpCollection.createIndex({ otp_id: 1 }, { unique: true });
    console.log('   Created index: otp_id (unique)');

    await otpCollection.createIndex({ user_id: 1, created_at: -1 });
    console.log('   Created index: user_id + created_at');

    await otpCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 3600 });
    console.log('   Created TTL index: expires_at (auto-delete after 1 hour)');

    // 3. Create mobile_devices collection
    console.log('\n3. Creating mobile_devices collection...');
    try {
      await db.createCollection('mobile_devices');
      console.log('   Created mobile_devices collection');
    } catch (e: any) {
      if (e.code === 48) {
        console.log('   Collection mobile_devices already exists');
      } else {
        throw e;
      }
    }

    // 4. Create indexes for mobile_devices
    console.log('4. Creating indexes for mobile_devices...');
    const devicesCollection = db.collection('mobile_devices');

    await devicesCollection.createIndex({ user_id: 1 });
    console.log('   Created index: user_id');

    await devicesCollection.createIndex({ device_id: 1 }, { unique: true });
    console.log('   Created index: device_id (unique)');

    await devicesCollection.createIndex({ push_token: 1 }, { sparse: true });
    console.log('   Created index: push_token (sparse)');

    // 5. Update users with mobile field
    console.log('\n5. Updating users collection...');
    const usersCollection = db.collection('users');

    // Count users with mobile phone numbers
    const usersWithMobilePhone = await usersCollection.countDocuments({
      phone: { $regex: /^(04|\+614)\d{8}$/ }
    });
    console.log(`   Found ${usersWithMobilePhone} users with mobile phone numbers`);

    // Update users with 04 format phones
    const result1 = await usersCollection.updateMany(
      {
        phone: { $regex: /^04\d{8}$/ },
        mobile: { $exists: false }
      },
      [
        {
          $set: {
            mobile: { $concat: ['+61', { $substr: ['$phone', 1, 9] }] },
            mobile_verified: false
          }
        }
      ]
    );
    console.log(`   Updated ${result1.modifiedCount} users (04 format -> +614)`);

    // Update users with +614 format phones
    const result2 = await usersCollection.updateMany(
      {
        phone: { $regex: /^\+614\d{8}$/ },
        mobile: { $exists: false }
      },
      [
        {
          $set: {
            mobile: '$phone',
            mobile_verified: false
          }
        }
      ]
    );
    console.log(`   Updated ${result2.modifiedCount} users (+614 format)`);

    // 6. Create index on users.mobile
    console.log('\n6. Creating index on users.mobile...');
    await usersCollection.createIndex({ mobile: 1 }, { sparse: true });
    console.log('   Created index: mobile (sparse)');

    // 7. Summary
    console.log('\n========================================');
    console.log('SETUP COMPLETE!');
    console.log('========================================');

    // Verify collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('\nCollections:');
    console.log(`  - mobile_otp_codes: ${collectionNames.includes('mobile_otp_codes') ? '✓' : '✗'}`);
    console.log(`  - mobile_devices: ${collectionNames.includes('mobile_devices') ? '✓' : '✗'}`);

    // Count users with mobile
    const usersWithMobile = await usersCollection.countDocuments({ mobile: { $exists: true } });
    console.log(`\nUsers with mobile field: ${usersWithMobile}`);

    // Show sample user with mobile
    const sampleUser = await usersCollection.findOne({ mobile: { $exists: true } });
    if (sampleUser) {
      console.log(`\nSample user mobile: ${sampleUser.mobile}`);
    }

    console.log('\n========================================');
    console.log('OTP Configuration:');
    console.log('  - Hardcoded OTP: 998877');
    console.log('  - Expiry: 10 minutes');
    console.log('  - Max attempts: 3');
    console.log('========================================\n');

  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

setup();
