/**
 * Migration Script: Opportunity Details
 *
 * Migrates application_details to opportunity_details table
 * Must run AFTER migrate-opportunities.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-opportunity-details.ts
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

interface OldApplicationDetails {
  id: number;
  application_id: number | null;
  reason_declined: string | null;
  additional_comments: string | null;
  address: string | null;
  street_address: string | null;
  city: string | null;
  state: number | null;
  postcode: string | null;
  net_profit: number | null;
  ammortisation: number | null;
  deprecition: number | null;
  existing_interest_costs: number | null;
  rental_expense: number | null;
  proposed_rental_income: number | null;
  existing_liabilities: number | null;
  additional_property: number | null;
  smsf_structure: number | null;
  ato_liabilities: number | null;
  credit_file_issues: number | null;
  disqualify_reason: string | null;
  ip_address: string | null;
  loan_acc_ref_no: string | null;
  flex_id: string | null;
  payment_received_date: string | null;
  payment_amount: number | null;
  overview: string | null;
  term1: number | null;
  term2: number | null;
  term3: number | null;
  term4: number | null;
}

interface OppMapping { old_id: number; new_id: string; opportunity_id: string; }

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

async function migrateOpportunityDetails() {
  console.log('Starting opportunity details migration...\n');

  // Read SQL file
  const detailsPath = path.join(__dirname, '..', 'clue_staging_db_table_application_details.sql');
  const detailsSql = fs.readFileSync(detailsPath, 'utf-8');
  const appDetails = parseInsertStatements(detailsSql) as OldApplicationDetails[];

  // Load opportunity mappings
  const mappingsDir = path.join(__dirname, '..', 'id_mappings');
  const oppMappings: OppMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'opportunities.json'), 'utf-8'));

  console.log(`Found ${appDetails.length} application details`);
  console.log(`Loaded ${oppMappings.length} opportunity mappings\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const details of appDetails) {
    // Find opportunity mapping
    const oppMapping = oppMappings.find(m => m.old_id === details.application_id);

    if (!oppMapping) {
      console.log(`Skipping details for application_id ${details.application_id} - no mapping`);
      skippedCount++;
      continue;
    }

    console.log(`Processing details for opportunity: ${oppMapping.opportunity_id}`);

    // Check if details already exist
    const { data: existing } = await supabase
      .from('opportunity_details')
      .select('id')
      .eq('opportunity_id', oppMapping.new_id)
      .single();

    if (existing) {
      console.log(`  -> Already exists, skipping\n`);
      skippedCount++;
      continue;
    }

    // Determine if unqualified based on disqualify_reason
    const isUnqualified = details.disqualify_reason && details.disqualify_reason.trim() !== '' ? 1 : 0;

    // Prepare details data
    const detailsData = {
      opportunity_id: oppMapping.new_id,
      address: details.address || null,
      street_address: details.street_address || null,
      city: details.city || null,
      state: details.state || null,
      postcode: details.postcode || null,
      net_profit: details.net_profit || null,
      ammortisation: details.ammortisation || null,
      deprecition: details.deprecition || null,
      existing_interest_costs: details.existing_interest_costs || null,
      rental_expense: details.rental_expense || null,
      proposed_rental_income: details.proposed_rental_income || null,
      existing_liabilities: details.existing_liabilities || null,
      additional_property: details.additional_property || null,
      smsf_structure: details.smsf_structure || null,
      ato_liabilities: details.ato_liabilities || null,
      credit_file_issues: details.credit_file_issues || null,
      reason_declined: details.reason_declined || null,
      disqualify_reason: details.disqualify_reason || null,
      unqualified_reason: details.disqualify_reason || null,
      is_unqualified: isUnqualified,
      ip_address: details.ip_address || null,
      loan_acc_ref_no: details.loan_acc_ref_no || null,
      flex_id: details.flex_id || null,
      payment_received_date: details.payment_received_date || null,
      payment_amount: details.payment_amount || null,
      brief_overview: details.overview || null,
      term1: details.term1 || null,
      term2: details.term2 || null,
      term3: details.term3 || null,
      term4: details.term4 || null,
    };

    const { error } = await supabase
      .from('opportunity_details')
      .insert(detailsData);

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created\n`);
    migratedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Details migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

migrateOpportunityDetails()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
