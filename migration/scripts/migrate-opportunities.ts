/**
 * Migration Script: Opportunities
 *
 * Migrates applications from old CakePHP to opportunities table
 * Must run AFTER migrate-organisations.ts, migrate-users.ts, migrate-clients.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-opportunities.ts
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

interface OldApplication {
  id: number;
  existing_client: number | null;
  client_id: number | null;
  referrer_group: number | null;
  user_id: number | null;
  application_id: string | null;
  loan_type: number | null;
  type_of_asset: number | null;
  loan_amount: number | null;
  estimated_property_value: string | null;
  loan_purpose: number | null;
  property_funded: number | null;
  deal_id: string | null;
  target_settlement_date: string | null;
  date_settled: string | null;
  application_status: number | null;
  application_decision: number | null;
  application_completed: number | null;
  status: number | null;
  date_time: string | null;
}

interface OrgMapping { old_user_id: number; new_org_id: string; company_name: string; }
interface UserMapping { old_id: number; new_id: string; email: string; role: string; }
interface ClientMapping { old_id: number; new_id: string; entity_name: string; }

// Parse SQL functions
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
      inString = true; stringChar = char; current += char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false; current += char;
    } else if (!inString && char === '(') {
      if (depth === 0) current = ''; else current += char;
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
      inString = true; stringChar = char; current += char;
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

// Status mapping
function mapStatus(app: OldApplication): string {
  // If date_settled is set and status=20, it's settled
  if (app.date_settled && app.status === 20) return 'settled';

  // Status 10 often means unqualified/declined
  if (app.status === 10) return 'declined';

  // Status 2 is often draft
  if (app.status === 2) return 'draft';

  // Map based on application_status
  switch (app.application_status) {
    case 1: return 'draft';
    case 2: return 'opportunity';
    case 3: return 'draft';
    case 4: return 'application_created';
    case 5: return 'application_submitted';
    case 6: return 'conditionally_approved';
    case 7: return 'approved';
    case 10: return 'declined';
    case 15: return 'withdrawn';
    case 20: return 'settled';
    default: return 'opportunity';
  }
}

// Loan type mapping
const loanTypeMap: Record<number, string> = {
  1: 'commercial_term_loan',
  2: 'commercial_loc',
  3: 'smsf_loan',
  4: 'equipment_finance',
  5: 'development_finance',
};

// Asset type mapping
const assetTypeMap: Record<number, string> = {
  1: 'commercial_property',
  2: 'residential_property',
  3: 'vacant_land',
};

// Loan purpose mapping
const loanPurposeMap: Record<number, string> = {
  1: 'purchase',
  3: 'refinance',
  5: 'equity_release',
  7: 'construction',
  9: 'development',
  11: 'business_acquisition',
  13: 'working_capital',
};

// Find org for user
function findOrgForUser(userId: number, users: any[], orgMappings: OrgMapping[]): string | null {
  const direct = orgMappings.find(m => m.old_user_id === userId);
  if (direct) return direct.new_org_id;

  const user = users.find(u => u.id === userId);
  if (user?.admin_id) return findOrgForUser(user.admin_id, users, orgMappings);

  return null;
}

async function migrateOpportunities() {
  console.log('Starting opportunities migration...\n');

  // Read SQL files
  const appsPath = path.join(__dirname, '..', 'loanease_staging_db_table_applications.sql');
  const usersPath = path.join(__dirname, '..', 'loanease_staging_db_table_users.sql');

  const appsSql = fs.readFileSync(appsPath, 'utf-8');
  const usersSql = fs.readFileSync(usersPath, 'utf-8');

  const applications = parseInsertStatements(appsSql) as OldApplication[];
  const users = parseInsertStatements(usersSql);

  // Load mappings
  const mappingsDir = path.join(__dirname, '..', 'id_mappings');
  const orgMappings: OrgMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'organisations.json'), 'utf-8'));
  const userMappings: UserMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'users.json'), 'utf-8'));
  const clientMappings: ClientMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'clients.json'), 'utf-8'));

  console.log(`Found ${applications.length} applications`);
  console.log(`Loaded mappings: ${orgMappings.length} orgs, ${userMappings.length} users, ${clientMappings.length} clients\n`);

  const oppMappings: { old_id: number; new_id: string; opportunity_id: string }[] = [];
  let skippedCount = 0;

  for (const app of applications) {
    console.log(`Processing: ${app.application_id} (old ID: ${app.id})`);

    // Find client mapping
    const clientMapping = clientMappings.find(m => m.old_id === app.client_id);
    if (!clientMapping) {
      console.log(`  -> Skipping: no client mapping for client_id ${app.client_id}\n`);
      skippedCount++;
      continue;
    }

    // Find organisation
    let organisationId: string | null = null;

    // Try referrer_group first
    if (app.referrer_group) {
      organisationId = findOrgForUser(app.referrer_group, users, orgMappings);
    }

    // Fall back to user_id
    if (!organisationId && app.user_id) {
      organisationId = findOrgForUser(app.user_id, users, orgMappings);
    }

    if (!organisationId) {
      console.log(`  -> Skipping: no org mapping\n`);
      skippedCount++;
      continue;
    }

    // Find created_by user
    const createdByMapping = userMappings.find(m => m.old_id === app.user_id);
    if (!createdByMapping) {
      console.log(`  -> Skipping: no user mapping for user_id ${app.user_id}\n`);
      skippedCount++;
      continue;
    }

    // Check if opportunity already exists
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id')
      .eq('opportunity_id', app.application_id || `LEGACY-${app.id}`)
      .single();

    if (existing) {
      console.log(`  -> Already exists: ${existing.id}\n`);
      oppMappings.push({
        old_id: app.id,
        new_id: existing.id,
        opportunity_id: app.application_id || `LEGACY-${app.id}`,
      });
      continue;
    }

    // Prepare opportunity data
    const oppData = {
      opportunity_id: app.application_id || `LEGACY-${app.id}`,
      organization_id: organisationId,
      client_id: clientMapping.new_id,
      status: mapStatus(app),
      loan_type: app.loan_type ? loanTypeMap[app.loan_type] || null : null,
      asset_type: app.type_of_asset ? assetTypeMap[app.type_of_asset] || null : null,
      loan_amount: app.loan_amount || null,
      estimated_property_value: app.estimated_property_value ? parseFloat(app.estimated_property_value) || null : null,
      loan_purpose: app.loan_purpose ? loanPurposeMap[app.loan_purpose] || null : null,
      external_ref: app.deal_id || null,
      target_settlement_date: app.target_settlement_date || null,
      date_settled: app.date_settled || null,
      created_by: createdByMapping.new_id,
      created_at: app.date_time ? new Date(app.date_time).toISOString() : new Date().toISOString(),
    };

    const { data: newOpp, error } = await supabase
      .from('opportunities')
      .insert(oppData)
      .select('id')
      .single();

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created: ${newOpp.id}\n`);
    oppMappings.push({
      old_id: app.id,
      new_id: newOpp.id,
      opportunity_id: oppData.opportunity_id,
    });
  }

  // Save mappings
  const mappingPath = path.join(__dirname, '..', 'id_mappings', 'opportunities.json');
  fs.writeFileSync(mappingPath, JSON.stringify(oppMappings, null, 2));

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Opportunities migrated: ${oppMappings.length}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Mapping saved to: ${mappingPath}`);
}

migrateOpportunities()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
