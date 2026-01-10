/**
 * Migration Script: Clients
 *
 * Migrates clients from old CakePHP to new clients table
 * Must run AFTER migrate-organisations.ts and migrate-users.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-clients.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface OldClient {
  id: number;
  user_id: number | null;
  entity: number | null;
  entity_name: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  email: string | null;
  abn: string | null;
  acn: string | null;
  time_in_business: string | null;
  industry: number | null;
  organisation_name: string | null;
  state: string | null;
  status: number | null;
  date_time: string | null;
}

interface OldClientDetails {
  id: number;
  client_id: number | null;
  address: string | null;
  street_address: string | null;
  city: string | null;
  state: number | null;
  postcode: string | null;
}

interface OrgMapping {
  old_user_id: number;
  new_org_id: string;
  company_name: string;
}

interface UserMapping {
  old_id: number;
  new_id: string;
  email: string;
  role: string;
}

// Parse SQL functions (reused)
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
        columns.forEach((col, idx) => { obj[col] = values[idx]; });
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

  for (let i = 0; i < valuesStr.length; i++) {
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
      if (depth === 0) { rows.push(current); current = ''; }
      else current += char;
    } else if (depth > 0) {
      current += char;
    }
  }
  return rows;
}

function parseRowValues(row: string): any[] {
  const values: any[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i <= row.length; i++) {
    const char = row[i] || ',';
    const prevChar = i > 0 ? row[i - 1] : '';

    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      if (row[i + 1] === stringChar) { current += char; i++; }
      else { inString = false; current += char; }
    } else if (!inString && (char === ',' || i === row.length)) {
      const trimmed = current.trim();
      if (trimmed === 'NULL' || trimmed === 'null') values.push(null);
      else if (trimmed.startsWith("'") && trimmed.endsWith("'"))
        values.push(trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/''/g, "'"));
      else if (!isNaN(Number(trimmed)) && trimmed !== '') values.push(Number(trimmed));
      else values.push(trimmed || null);
      current = '';
    } else {
      current += char;
    }
  }
  return values;
}

// Industry mapping
const industryMap: Record<number, string> = {
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

// Find organisation for a user (follows admin_id chain)
function findOrgForUser(
  userId: number,
  users: Record<string, any>[],
  orgMappings: OrgMapping[]
): string | null {
  // Direct mapping
  const directMapping = orgMappings.find(m => m.old_user_id === userId);
  if (directMapping) return directMapping.new_org_id;

  // Find user and follow admin_id
  const user = users.find(u => u.id === userId);
  if (user && user.admin_id) {
    return findOrgForUser(user.admin_id, users, orgMappings);
  }

  return null;
}

async function migrateClients() {
  console.log('Starting clients migration...\n');

  // Read SQL files
  const clientsPath = path.join(__dirname, '..', 'clue_staging_db_table_clients.sql');
  const clientDetailsPath = path.join(__dirname, '..', 'clue_staging_db_table_client_details.sql');
  const usersPath = path.join(__dirname, '..', 'clue_staging_db_table_users.sql');

  const clientsSql = fs.readFileSync(clientsPath, 'utf-8');
  const clientDetailsSql = fs.readFileSync(clientDetailsPath, 'utf-8');
  const usersSql = fs.readFileSync(usersPath, 'utf-8');

  const clients = parseInsertStatements(clientsSql) as OldClient[];
  const clientDetails = parseInsertStatements(clientDetailsSql) as OldClientDetails[];
  const users = parseInsertStatements(usersSql);

  // Load mappings
  const orgMappingPath = path.join(__dirname, '..', 'id_mappings', 'organisations.json');
  const userMappingPath = path.join(__dirname, '..', 'id_mappings', 'users.json');

  if (!fs.existsSync(orgMappingPath) || !fs.existsSync(userMappingPath)) {
    console.error('Mappings not found. Run migrate-organisations.ts and migrate-users.ts first.');
    process.exit(1);
  }

  const orgMappings: OrgMapping[] = JSON.parse(fs.readFileSync(orgMappingPath, 'utf-8'));
  const userMappings: UserMapping[] = JSON.parse(fs.readFileSync(userMappingPath, 'utf-8'));

  // Create client details lookup
  const clientDetailsMap = new Map<number, OldClientDetails>();
  for (const cd of clientDetails) {
    if (cd.client_id) clientDetailsMap.set(cd.client_id, cd);
  }

  console.log(`Found ${clients.length} clients`);
  console.log(`Found ${clientDetails.length} client details`);
  console.log(`Loaded ${orgMappings.length} org mappings`);
  console.log(`Loaded ${userMappings.length} user mappings\n`);

  const clientMappings: { old_id: number; new_id: string; entity_name: string }[] = [];
  let skippedCount = 0;

  for (const client of clients) {
    // Find organisation for this client
    let organisationId: string | null = null;

    if (client.user_id) {
      organisationId = findOrgForUser(client.user_id, users, orgMappings);
    }

    if (!organisationId) {
      console.log(`Skipping client "${client.entity_name || client.first_name}" - no org mapping for user_id: ${client.user_id}`);
      skippedCount++;
      continue;
    }

    // Find user mapping for created_by
    const createdByMapping = userMappings.find(m => m.old_id === client.user_id);
    const createdBy = createdByMapping?.new_id;

    if (!createdBy) {
      console.log(`Skipping client "${client.entity_name || client.first_name}" - no user mapping for created_by`);
      skippedCount++;
      continue;
    }

    const details = clientDetailsMap.get(client.id);

    // Prepare client data
    const entityName = client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown';

    console.log(`Migrating: ${entityName} (old ID: ${client.id})`);

    // Check if client already exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('organisation_id', organisationId)
      .eq('entity_name', entityName)
      .single();

    if (existing) {
      console.log(`  -> Already exists: ${existing.id}, skipping\n`);
      clientMappings.push({
        old_id: client.id,
        new_id: existing.id,
        entity_name: entityName,
      });
      continue;
    }

    const clientData = {
      organisation_id: organisationId,
      entity_type: client.entity || null,
      entity_name: entityName,
      contact_first_name: client.first_name || null,
      contact_last_name: client.last_name || null,
      contact_phone: client.mobile || null,
      contact_email: client.email || null,
      abn: client.abn || null,
      industry: client.industry ? industryMap[client.industry] || null : null,
      address: details?.address || null,
      created_by: createdBy,
      created_at: client.date_time ? new Date(client.date_time).toISOString() : new Date().toISOString(),
    };

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select('id')
      .single();

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created: ${newClient.id}\n`);
    clientMappings.push({
      old_id: client.id,
      new_id: newClient.id,
      entity_name: entityName,
    });
  }

  // Save mappings
  const mappingPath = path.join(__dirname, '..', 'id_mappings', 'clients.json');
  fs.writeFileSync(mappingPath, JSON.stringify(clientMappings, null, 2));

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Clients migrated: ${clientMappings.length}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Mapping saved to: ${mappingPath}`);
}

migrateClients()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
