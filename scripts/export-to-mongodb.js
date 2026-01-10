/**
 * Export all Supabase tables to JSON files for MongoDB import
 *
 * Run with: node scripts/export-to-mongodb.js
 *
 * This will create JSON files in the /exports folder that can be imported into MongoDB using:
 * mongoimport --db loanease --collection <collection_name> --file exports/<table_name>.json --jsonArray
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

// All tables to export
const TABLES = [
  'users',
  'organisations',
  'organisation_directors',
  'organisation_details',
  'clients',
  'opportunities',
  'opportunity_details',
  'comments',
  'audit_logs',
  'global_settings',
  'email_verification_tokens',
  'pre_assessment_contacts',
  'login_history'
];

// Create exports directory
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

async function exportTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    process.exit(1);
  }

  console.log('🔧 Initializing Supabase client...\n');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Create exports directory if it doesn't exist
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    console.log('📁 Created exports directory\n');
  }

  const results = {
    success: [],
    failed: [],
    empty: []
  };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                 EXPORTING SUPABASE TABLES                  ');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const table of TABLES) {
    try {
      console.log(`📤 Exporting ${table}...`);

      // Fetch all data from the table
      // Use pagination for large tables
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        console.log(`   ⚠️  ${table}: No data found (empty table)`);
        results.empty.push(table);
        continue;
      }

      // Transform data for MongoDB compatibility
      const mongoData = allData.map(row => {
        // Convert Supabase UUID 'id' to MongoDB '_id'
        const mongoRow = { ...row };
        if (mongoRow.id) {
          mongoRow._id = mongoRow.id;
          delete mongoRow.id;
        }
        return mongoRow;
      });

      // Write to JSON file
      const filePath = path.join(EXPORTS_DIR, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(mongoData, null, 2));

      console.log(`   ✅ ${table}: ${allData.length} records exported`);
      results.success.push({ table, count: allData.length });

    } catch (error) {
      console.log(`   ❌ ${table}: Failed - ${error.message}`);
      results.failed.push({ table, error: error.message });
    }
  }

  // Also export Supabase Auth users (from auth.users)
  console.log(`\n📤 Exporting auth_users (Supabase Auth)...`);
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    if (authUsers && authUsers.users && authUsers.users.length > 0) {
      const mongoAuthUsers = authUsers.users.map(user => ({
        _id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      }));

      const authFilePath = path.join(EXPORTS_DIR, 'auth_users.json');
      fs.writeFileSync(authFilePath, JSON.stringify(mongoAuthUsers, null, 2));

      console.log(`   ✅ auth_users: ${authUsers.users.length} records exported`);
      results.success.push({ table: 'auth_users', count: authUsers.users.length });
    } else {
      console.log(`   ⚠️  auth_users: No data found`);
      results.empty.push('auth_users');
    }
  } catch (error) {
    console.log(`   ❌ auth_users: Failed - ${error.message}`);
    results.failed.push({ table: 'auth_users', error: error.message });
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                       EXPORT SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✅ Successfully exported: ${results.success.length} tables`);
  results.success.forEach(({ table, count }) => {
    console.log(`   - ${table}: ${count} records`);
  });

  if (results.empty.length > 0) {
    console.log(`\n⚠️  Empty tables (no data): ${results.empty.length}`);
    results.empty.forEach(table => {
      console.log(`   - ${table}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed exports: ${results.failed.length}`);
    results.failed.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`);
    });
  }

  // Create a combined export file for easy MongoDB restore
  console.log('\n📦 Creating combined export...');
  const combinedExport = {};
  for (const { table } of results.success) {
    const filePath = path.join(EXPORTS_DIR, `${table}.json`);
    if (fs.existsSync(filePath)) {
      combinedExport[table] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  fs.writeFileSync(
    path.join(EXPORTS_DIR, '_combined_export.json'),
    JSON.stringify(combinedExport, null, 2)
  );
  console.log('   ✅ Created _combined_export.json');

  // Create MongoDB import script
  const importScript = `#!/bin/bash
# MongoDB Import Script
# Run this script to import all collections into MongoDB

DB_NAME="loanease"

${results.success.map(({ table }) =>
  `mongoimport --db $DB_NAME --collection ${table} --file ${table}.json --jsonArray --drop`
).join('\n')}

echo "✅ Import complete!"
`;

  fs.writeFileSync(path.join(EXPORTS_DIR, 'import-to-mongodb.sh'), importScript);
  console.log('   ✅ Created import-to-mongodb.sh');

  // Create Windows batch import script
  const importBatch = `@echo off
REM MongoDB Import Script for Windows
REM Run this script to import all collections into MongoDB

SET DB_NAME=loanease

${results.success.map(({ table }) =>
  `mongoimport --db %DB_NAME% --collection ${table} --file ${table}.json --jsonArray --drop`
).join('\n')}

echo Import complete!
pause
`;

  fs.writeFileSync(path.join(EXPORTS_DIR, 'import-to-mongodb.bat'), importBatch);
  console.log('   ✅ Created import-to-mongodb.bat\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                     EXPORT COMPLETE!                        ');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📁 Files saved to: ${EXPORTS_DIR}`);
  console.log('\n📌 To import into MongoDB, navigate to the exports folder and run:');
  console.log('   - Linux/Mac: ./import-to-mongodb.sh');
  console.log('   - Windows:   import-to-mongodb.bat');
  console.log('\n💡 Or import individual collections:');
  console.log('   mongoimport --db loanease --collection users --file users.json --jsonArray');
  console.log('\n');
}

exportTables().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
