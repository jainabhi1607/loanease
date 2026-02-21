/**
 * Script to create a Super Admin user in MongoDB
 *
 * Run with: node scripts/create-super-admin.js
 *
 * Make sure your .env.local has:
 * - MONGODB_URI
 * - MONGODB_DB
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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

// Super Admin Credentials
const SUPER_ADMIN = {
  email: 'jainabhi1607@gmail.com',
  password: 'Qwert!2345',
  first_name: 'Loanease',
  surname: 'Admin',
};

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
    const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);

    // Check if user already exists
    const existing = await db.collection('users').findOne({ email: SUPER_ADMIN.email });

    if (existing) {
      console.log('User already exists. Updating to super_admin with new password...');
      await db.collection('users').updateOne(
        { email: SUPER_ADMIN.email },
        {
          $set: {
            password_hash: passwordHash,
            role: 'super_admin',
            first_name: SUPER_ADMIN.first_name,
            surname: SUPER_ADMIN.surname,
            is_active: true,
            email_verified: true,
            two_fa_enabled: false,
          }
        }
      );
      console.log('User updated successfully!');
      console.log('User ID:', existing._id);
    } else {
      const userId = uuidv4();
      await db.collection('users').insertOne({
        _id: userId,
        email: SUPER_ADMIN.email,
        password_hash: passwordHash,
        first_name: SUPER_ADMIN.first_name,
        surname: SUPER_ADMIN.surname,
        phone: '',
        role: 'super_admin',
        organisation_id: null,
        two_fa_enabled: false,
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
      });
      console.log('Super admin created successfully!');
      console.log('User ID:', userId);
    }

    console.log('\nEmail:', SUPER_ADMIN.email);
    console.log('Role: super_admin');
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
