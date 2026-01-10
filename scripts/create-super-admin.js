/**
 * Script to create a Super Admin user
 *
 * This creates a super admin user in the system.
 * Run with: node scripts/create-super-admin.js
 *
 * Make sure your .env.local has:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 */

const fs = require('fs');
const path = require('path');

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

const { createClient } = require('@supabase/supabase-js');

// Super Admin Credentials
const SUPER_ADMIN_EMAIL = 'admin@loanease.com';
const SUPER_ADMIN_PASSWORD = 'Admin123!@#';
const SUPER_ADMIN_FIRST_NAME = 'Loanease';
const SUPER_ADMIN_LAST_NAME = 'Admin';

async function createSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    process.exit(1);
  }

  console.log('🔧 Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('\n📧 Creating super admin user...');
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(user => user.email === SUPER_ADMIN_EMAIL);

    if (userExists) {
      console.log('⚠️  User already exists, updating role...');

      const existingUser = existingUsers.users.find(u => u.email === SUPER_ADMIN_EMAIL);

      // Update user profile to super_admin
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: existingUser.id,
          email: SUPER_ADMIN_EMAIL,
          first_name: SUPER_ADMIN_FIRST_NAME,
          surname: SUPER_ADMIN_LAST_NAME,
          role: 'super_admin',
          two_fa_enabled: false, // Set to true if you want to enforce 2FA
          organisation_id: null
        }, {
          onConflict: 'id'
        });

      if (updateError) {
        console.error('❌ Error updating user profile:', updateError);
        throw updateError;
      }

      console.log('✅ User role updated to super_admin');

    } else {
      // Create new user
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: SUPER_ADMIN_FIRST_NAME,
          last_name: SUPER_ADMIN_LAST_NAME
        }
      });

      if (createError) {
        console.error('❌ Error creating user:', createError);
        throw createError;
      }

      console.log('✅ User created successfully');
      console.log('User ID:', userData.user.id);

      // Create user profile
      console.log('\n👤 Creating user profile...');
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userData.user.id,
          email: SUPER_ADMIN_EMAIL,
          first_name: SUPER_ADMIN_FIRST_NAME,
          surname: SUPER_ADMIN_LAST_NAME,
          role: 'super_admin',
          two_fa_enabled: false, // Set to true if you want to enforce 2FA
          organisation_id: null
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw profileError;
      }

      console.log('✅ Profile created successfully');
    }

    console.log('\n🎉 Super Admin Setup Complete!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    ', SUPER_ADMIN_EMAIL);
    console.log('🔑 Password: ', SUPER_ADMIN_PASSWORD);
    console.log('═══════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('💡 You can now login at: http://localhost:3000/login');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Failed to create super admin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
