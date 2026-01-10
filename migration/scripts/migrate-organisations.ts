/**
 * Migration Script: Organisations
 *
 * Extracts organisations from old CakePHP users table
 * where role=3 (referrer_admin) and admin_id IS NULL
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-organisations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

// Types for old data
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
  acn: string | null;
  number_of_directors: number | null;
  entity: number | null;
  industry_type: number | null;
  trading_name: string | null;
  state: string | null;
  role: number | null;
  status: number | null;
}

interface OldUserDetails {
  id: number;
  user_id: number;
  abn: string | null;
  acn: string | null;
  address: string | null;
  street_address: string | null;
  city: string | null;
  state: number | null;
  postcode: string | null;
  ip_address: string | null;
  two_factor_auth: number | null;
  organisation_name: string | null;
  date_time: string | null;
  custom_commission_split: string | null;
}

// Parse SQL INSERT statements
function parseInsertStatements(sql: string): Record<string, any>[] {
  const results: Record<string, any>[] = [];

  // Match INSERT INTO ... VALUES pattern
  const insertMatch = sql.match(/INSERT INTO `\w+` \(([^)]+)\) VALUES\s*([\s\S]+?);(?=\s*$|\s*--|\s*INSERT|\s*CREATE)/gm);

  if (!insertMatch) return results;

  for (const statement of insertMatch) {
    // Extract column names
    const columnsMatch = statement.match(/INSERT INTO `\w+` \(([^)]+)\)/);
    if (!columnsMatch) continue;

    const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));

    // Extract VALUES part
    const valuesMatch = statement.match(/VALUES\s*([\s\S]+)/);
    if (!valuesMatch) continue;

    // Split by ),( to get individual rows - handle multiline
    const valuesStr = valuesMatch[1].replace(/;\s*$/, '');

    // Parse each row
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

// Split value rows handling nested parentheses and quotes
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
      if (depth === 0) {
        current = '';
      } else {
        current += char;
      }
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

// Parse individual row values
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
      // Check for escaped quote (double quote)
      if (row[i + 1] === stringChar) {
        current += char;
        i++;
      } else {
        inString = false;
        current += char;
      }
    } else if (!inString && (char === ',' || i === row.length)) {
      // End of value
      const trimmed = current.trim();
      if (trimmed === 'NULL' || trimmed === 'null') {
        values.push(null);
      } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        // String value - remove quotes and unescape
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

// Industry type mapping (old INT to new string)
const industryTypeMap: Record<number, string> = {
  1: 'accounting',
  2: 'agriculture',
  3: 'automotive',
  4: 'construction',
  5: 'education',
  6: 'finance',
  7: 'healthcare',
  8: 'hospitality',
  9: 'information_technology',
  10: 'legal',
  11: 'manufacturing',
  12: 'real_estate',
  13: 'retail',
  14: 'other',
};

// State mapping (old INT to string)
const stateMap: Record<number, string> = {
  1: 'ACT',
  2: 'NSW',
  3: 'NT',
  4: 'QLD',
  5: 'SA',
  6: 'TAS',
  7: 'VIC',
  8: 'WA',
};

async function migrateOrganisations() {
  console.log('Starting organisation migration...\n');

  // Read SQL files
  const usersPath = path.join(__dirname, '..', 'clue_staging_db_table_users.sql');
  const userDetailsPath = path.join(__dirname, '..', 'clue_staging_db_table_user_details.sql');

  const usersSql = fs.readFileSync(usersPath, 'utf-8');
  const userDetailsSql = fs.readFileSync(userDetailsPath, 'utf-8');

  // Parse data
  const users = parseInsertStatements(usersSql) as OldUser[];
  const userDetails = parseInsertStatements(userDetailsSql) as OldUserDetails[];

  console.log(`Found ${users.length} users`);
  console.log(`Found ${userDetails.length} user details\n`);

  // Create user details lookup
  const userDetailsMap = new Map<number, OldUserDetails>();
  for (const ud of userDetails) {
    userDetailsMap.set(ud.user_id, ud);
  }

  // Filter for organisation owners (role=3, admin_id IS NULL, has company_name)
  const orgOwners = users.filter(u =>
    u.role === 3 &&
    u.admin_id === null &&
    u.company_name &&
    u.company_name.trim() !== ''
  );

  console.log(`Found ${orgOwners.length} organisation owners\n`);

  // Store mapping for later use
  const idMapping: { old_user_id: number; new_org_id: string; company_name: string }[] = [];

  // Migrate each organisation
  for (const owner of orgOwners) {
    const details = userDetailsMap.get(owner.id);

    // Clean ABN - remove non-numeric characters for storage, but keep original if it's test data
    let cleanAbn = owner.abn ? owner.abn.replace(/\s/g, '') : '';

    // Get state from user or details
    let state = owner.state || null;
    if (details?.state && typeof details.state === 'number') {
      state = stateMap[details.state] || null;
    }

    // Prepare organisation data
    const orgData = {
      name: owner.company_name!.trim(),
      abn: cleanAbn || `LEGACY-${owner.id}`, // Use legacy ID if no ABN
      trading_name: owner.trading_name || null,
      phone: owner.phone || null,
      address: details?.address || null,
      suburb: details?.city || null,
      state: state,
      postcode: details?.postcode || null,
      industry: owner.industry_type ? industryTypeMap[owner.industry_type] || null : null,
      is_active: owner.status === 1,
      agreement_ip: details?.ip_address || null,
      agreement_date: details?.date_time ? new Date(details.date_time).toISOString() : null,
    };

    console.log(`Migrating: ${orgData.name} (old user ID: ${owner.id})`);

    // Check if organisation already exists (by ABN or name)
    const { data: existing } = await supabase
      .from('organisations')
      .select('id')
      .or(`abn.eq.${orgData.abn},name.eq.${orgData.name}`)
      .single();

    if (existing) {
      console.log(`  -> Already exists with ID: ${existing.id}, skipping\n`);
      idMapping.push({
        old_user_id: owner.id,
        new_org_id: existing.id,
        company_name: orgData.name,
      });
      continue;
    }

    // Insert organisation
    const { data: newOrg, error } = await supabase
      .from('organisations')
      .insert(orgData)
      .select('id')
      .single();

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created with ID: ${newOrg.id}\n`);

    idMapping.push({
      old_user_id: owner.id,
      new_org_id: newOrg.id,
      company_name: orgData.name,
    });

    // If there's custom commission split, add to organisation_details
    if (details?.custom_commission_split && details.custom_commission_split.trim() !== '') {
      const { error: detailsError } = await supabase
        .from('organisation_details')
        .insert({
          organisation_id: newOrg.id,
          commission_split: details.custom_commission_split,
        });

      if (detailsError) {
        console.log(`  -> Warning: Could not add commission split: ${detailsError.message}`);
      } else {
        console.log(`  -> Added custom commission split`);
      }
    }
  }

  // Save mapping for later migrations
  const mappingPath = path.join(__dirname, '..', 'id_mappings', 'organisations.json');
  fs.mkdirSync(path.dirname(mappingPath), { recursive: true });
  fs.writeFileSync(mappingPath, JSON.stringify(idMapping, null, 2));

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Organisations migrated: ${idMapping.length}`);
  console.log(`Mapping saved to: ${mappingPath}`);
}

// Run migration
migrateOrganisations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
