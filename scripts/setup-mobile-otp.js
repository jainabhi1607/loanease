/**
 * MongoDB Setup Script for Mobile OTP Authentication
 *
 * Run this script directly in MongoDB Shell (mongosh) or via Node.js
 *
 * Usage with mongosh:
 *   mongosh "mongodb+srv://..." --eval "load('setup-mobile-otp.js')"
 *
 * Or copy and paste the commands into MongoDB Compass Shell
 */

// Switch to loanease database
// use loanease;

// ============================================
// 1. Create mobile_otp_codes collection
// ============================================
db.createCollection('mobile_otp_codes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'mobile', 'otp', 'otp_id', 'expires_at', 'created_at'],
      properties: {
        _id: { bsonType: 'string' },
        user_id: { bsonType: 'string' },
        mobile: { bsonType: 'string' },
        email: { bsonType: 'string' },
        otp: { bsonType: 'string' },
        otp_id: { bsonType: 'string' },
        attempts: { bsonType: 'int' },
        max_attempts: { bsonType: 'int' },
        expires_at: { bsonType: 'date' },
        verified_at: { bsonType: ['date', 'null'] },
        created_at: { bsonType: 'date' },
        device_id: { bsonType: 'string' },
        ip_address: { bsonType: 'string' }
      }
    }
  }
});

print('Created mobile_otp_codes collection');

// Create indexes for mobile_otp_codes
db.mobile_otp_codes.createIndex({ mobile: 1, expires_at: 1 });
db.mobile_otp_codes.createIndex({ otp_id: 1 }, { unique: true });
db.mobile_otp_codes.createIndex({ user_id: 1, created_at: -1 });
db.mobile_otp_codes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 3600 }); // TTL: auto-delete after 1 hour

print('Created indexes for mobile_otp_codes');

// ============================================
// 2. Create mobile_devices collection
// ============================================
db.createCollection('mobile_devices', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'device_id'],
      properties: {
        _id: { bsonType: 'string' },
        user_id: { bsonType: 'string' },
        device_id: { bsonType: 'string' },
        device_name: { bsonType: 'string' },
        device_os: { bsonType: 'string' },
        push_token: { bsonType: 'string' },
        biometric_enabled: { bsonType: 'bool' },
        last_active_at: { bsonType: 'date' },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});

print('Created mobile_devices collection');

// Create indexes for mobile_devices
db.mobile_devices.createIndex({ user_id: 1 });
db.mobile_devices.createIndex({ device_id: 1 }, { unique: true });
db.mobile_devices.createIndex({ push_token: 1 });

print('Created indexes for mobile_devices');

// ============================================
// 3. Add mobile field to users collection
// ============================================

// First, let's see how many users have phone numbers that look like mobile
print('\nChecking users with mobile-like phone numbers...');
const mobileRegex = /^(\+?61|0)?4\d{8}$/;

const usersWithMobilePhone = db.users.countDocuments({
  phone: { $regex: /^(\+?61|0)?4\d{8}$/ }
});
print(`Found ${usersWithMobilePhone} users with mobile phone numbers`);

// Add mobile field to users if not exists (copy from phone if it's a mobile number)
db.users.updateMany(
  {
    phone: { $regex: /^(\+?61)?4\d{8}$/ },
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

db.users.updateMany(
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

print('Updated users with mobile field');

// Create index on mobile field
db.users.createIndex({ mobile: 1 }, { sparse: true });
print('Created index on users.mobile');

// ============================================
// 4. Summary
// ============================================
print('\n========================================');
print('Mobile OTP Setup Complete!');
print('========================================');
print('\nCollections created:');
print('  - mobile_otp_codes');
print('  - mobile_devices');
print('\nIndexes created:');
print('  - mobile_otp_codes: mobile+expires_at, otp_id (unique), user_id+created_at, TTL on expires_at');
print('  - mobile_devices: user_id, device_id (unique), push_token');
print('  - users: mobile (sparse)');
print('\nUsers updated:');
print(`  - ${usersWithMobilePhone} users had mobile numbers copied from phone field`);
print('\nHardcoded OTP for testing: 998877');
print('OTP expires after: 10 minutes');
print('========================================');
