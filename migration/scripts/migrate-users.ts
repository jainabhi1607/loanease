/**
 * Migration Script: Users
 *
 * Migrates users from old CakePHP to Supabase Auth + users table
 * Must run AFTER migrate-organisations.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Types
interface OldUser {
  id: number;
  admin_id: number | null;
  username: string | null;
  company_name: string | null;
  name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  abn: string | null;
  role: number | null;
  status: number | null;
}

interface OrgMapping {
  old_user_id: number;
  new_org_id: string;
  company_name: string;
}

// Parse SQL INSERT statements (same as organisations script)
function parseInsertStatements(sql: string): Record<string, any>[] {
  const results: Record<string, any>[] = [];
  const insertMatch = sql.match(/INSERT INTO `\w+` \(([^)]+)\) VALUES\s*([\s\S]+?);(?=\s*$|\s*--|\s*INSERT|\s*CREATE)/gm);
  if (!insertMatch) return results;

  for (const statement of insertMatch) {
    const columnsMatch = statement.match(/INSERT INTO `\w+` \(([^)]+)\)/);
    if (!columnsMatch) continue;
    const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
    const valuesMatch = statement.match(/VALUES\s*([\s\S]+)/);
    if (!valuesMatch) continue;
    const valuesStr = valuesMatch[1].replace(/;\s*$/, '');
    const rows = splitValueRows(valuesStr);

    for (const row of rows) {
      const values = parseRowValues(row);
      if (values.length === columns.length) {
        const obj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          obj[col] = values[idx];
        });
        results.push(obj);
      }
    }
  }
  return results;
}

function splitValueRows(valuesStr: string): string[] {
  const rows: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < valuesStr.length) {
    const char = valuesStr[i];
    const prevChar = i > 0 ? valuesStr[i - 1] : '';

    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      current += char;
    } else if (!inString && char === '(') {
      if (depth === 0) current = '';
      else current += char;
      depth++;
    } else if (!inString && char === ')') {
      depth--;
      if (depth === 0) {
        rows.push(current);
        current = '';
      } else {
        current += char;
      }
    } else if (depth > 0) {
      current += char;
    }
    i++;
  }
  return rows;
}

function parseRowValues(row: string): any[] {
  const values: any[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i <= row.length) {
    const char = row[i] || ',';
    const prevChar = i > 0 ? row[i - 1] : '';

    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      if (row[i + 1] === stringChar) {
        current += char;
        i++;
      } else {
        inString = false;
        current += char;
      }
    } else if (!inString && (char === ',' || i === row.length)) {
      const trimmed = current.trim();
      if (trimmed === 'NULL' || trimmed === 'null') {
        values.push(null);
      } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        values.push(trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/''/g, "'"));
      } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        values.push(trimmed.slice(1, -1).replace(/\\"/g, '"'));
      } else if (!isNaN(Number(trimmed)) && trimmed !== '') {
        values.push(Number(trimmed));
      } else {
        values.push(trimmed || null);
      }
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  return values;
}

// Map old role to new role
function mapRole(oldRole: number | null, email: string | null): string {
  // Special case for main admin
  if (email === 'admin@cluefinance.com.au' || email === 'luay@duofinance.com.au') {
    return 'super_admin';
  }

  switch (oldRole) {
    case 1: // Admin
    case 2: // Admin Team
      return 'admin_team';
    case 3: // Referrer Admin
      return 'referrer_admin';
    case 4: // Referrer Team
    case 7: // Team Member
      return 'referrer_team';
    case 9: // Client
      return 'client';
    default:
      return 'referrer_team';
  }
}

// Find organisation for a user based on their admin_id chain
function findOrganisationId(
  user: OldUser,
  users: OldUser[],
  orgMappings: OrgMapping[]
): string | null {
  // If user is an org owner (role=3, admin_id=null), look up directly
  if (user.role === 3 && user.admin_id === null) {
    const mapping = orgMappings.find(m => m.old_user_id === user.id);
    return mapping?.new_org_id || null;
  }

  // If user has admin_id, follow the chain
  if (user.admin_id) {
    // First check if admin_id directly maps to an org
    const directMapping = orgMappings.find(m => m.old_user_id === user.admin_id);
    if (directMapping) {
      return directMapping.new_org_id;
    }

    // Otherwise, find the admin user and check their org
    const adminUser = users.find(u => u.id === user.admin_id);
    if (adminUser) {
      // Recursively find the org
      return findOrganisationId(adminUser, users, orgMappings);
    }
  }

  return null;
}

// Generate a random password for new users
function generateTempPassword(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function migrateUsers() {
  console.log('Starting user migration...\n');

  // Read SQL files
  const usersPath = path.join(__dirname, '..', 'clue_staging_db_table_users.sql');
  const usersSql = fs.readFileSync(usersPath, 'utf-8');
  const users = parseInsertStatements(usersSql) as OldUser[];

  // Load organisation mappings
  const orgMappingPath = path.join(__dirname, '..', 'id_mappings', 'organisations.json');
  if (!fs.existsSync(orgMappingPath)) {
    console.error('Organisation mappings not found. Run migrate-organisations.ts first.');
    process.exit(1);
  }
  const orgMappings: OrgMapping[] = JSON.parse(fs.readFileSync(orgMappingPath, 'utf-8'));

  console.log(`Found ${users.length} users to migrate`);
  console.log(`Loaded ${orgMappings.length} organisation mappings\n`);

  // Store user ID mappings
  const userMappings: { old_id: number; new_id: string; email: string; role: string }[] = [];

  // Filter out users that shouldn't be migrated (test/invalid users)
  const validUsers = users.filter(u =>
    u.email &&
    u.email.trim() !== '' &&
    u.status === 1 // Only active users
  );

  console.log(`Valid users to migrate: ${validUsers.length}\n`);

  for (const user of validUsers) {
    const email = user.email!.toLowerCase().trim();
    const role = mapRole(user.role, email);
    const organisationId = findOrganisationId(user, users, orgMappings);

    console.log(`Migrating: ${email} (old ID: ${user.id}, role: ${role})`);

    // Check if user already exists
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const existingUser = existingAuth?.users.find(u => u.email?.toLowerCase() === email);

    let authUserId: string;

    if (existingUser) {
      console.log(`  -> Auth user exists: ${existingUser.id}`);
      authUserId = existingUser.id;
    } else {
      // Create auth user with temporary password
      const tempPassword = generateTempPassword();
      const { data: newAuth, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // Skip email verification for migrated users
        user_metadata: {
          migrated: true,
          old_id: user.id,
        },
      });

      if (authError) {
        console.error(`  -> Auth error: ${authError.message}`);
        continue;
      }

      authUserId = newAuth.user.id;
      console.log(`  -> Created auth user: ${authUserId}`);
    }

    // Check if users table entry exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single();

    if (existingProfile) {
      console.log(`  -> Profile exists, skipping\n`);
      userMappings.push({
        old_id: user.id,
        new_id: authUserId,
        email: email,
        role: role,
      });
      continue;
    }

    // Create users table entry
    const userData = {
      id: authUserId,
      email: email,
      first_name: user.name || 'Unknown',
      last_name: user.last_name || '',
      phone: user.phone || null,
      role: role,
      organisation_id: organisationId,
      is_active: true,
    };

    const { error: profileError } = await supabase
      .from('users')
      .insert(userData);

    if (profileError) {
      console.error(`  -> Profile error: ${profileError.message}`);
      continue;
    }

    console.log(`  -> Created profile (org: ${organisationId || 'none'})\n`);

    userMappings.push({
      old_id: user.id,
      new_id: authUserId,
      email: email,
      role: role,
    });
  }

  // Save mappings
  const mappingPath = path.join(__dirname, '..', 'id_mappings', 'users.json');
  fs.writeFileSync(mappingPath, JSON.stringify(userMappings, null, 2));

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Users migrated: ${userMappings.length}`);
  console.log(`Mapping saved to: ${mappingPath}`);
  console.log('\nIMPORTANT: All migrated users need to reset their passwords!');
}

migrateUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
