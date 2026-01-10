/**
 * Migration Script: Global Settings
 *
 * Migrates global_settings from old CakePHP to new global_settings table
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-global-settings.ts
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

interface OldGlobalSettings {
  id: number;
  new_signup_email_subject: string | null;
  new_signup_email_content: string | null;
  password_recovery_email_subject: string | null;
  password_recovery_email_content: string | null;
  account_approved_email_subject: string | null;
  account_approved_email_content: string | null;
  account_cancelled_email_subject: string | null;
  account_cancelled_email_content: string | null;
  new_lead_email_subject: string | null;
  new_lead_email_content: string | null;
  new_broker_email_subject: string | null;
  new_broker_email_content: string | null;
  postmark_apikey: string | null;
  google_apikey: string | null;
  abn_authentication_guid: string | null;
  lead_alert: string | null;
  interest_rate: number | null;
  broker_retailer_information: string | null;
  terms_conditions: string | null;
  new_broker_alert: string | null;
  referrer_agreement_subject: string | null;
  referrer_agreement_content: string | null;
  referrer_fee_content: string | null;
  new_user_subject: string | null;
  new_user_content: string | null;
}

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

async function migrateGlobalSettings() {
  console.log('Starting global settings migration...\n');

  // Read SQL file
  const settingsPath = path.join(__dirname, '..', 'clue_staging_db_table_global_settings.sql');
  const settingsSql = fs.readFileSync(settingsPath, 'utf-8');
  const settings = parseInsertStatements(settingsSql) as OldGlobalSettings[];

  if (settings.length === 0) {
    console.log('No settings found to migrate');
    return;
  }

  const oldSettings = settings[0]; // Usually only one row
  console.log('Found global settings to migrate\n');

  // Check if settings already exist
  const { data: existing } = await supabase
    .from('global_settings')
    .select('id')
    .single();

  // Prepare settings data - map old field names to new
  const settingsData = {
    // Email templates
    new_signup_email_subject: oldSettings.new_signup_email_subject,
    new_signup_email_content: oldSettings.new_signup_email_content,
    new_broker_email_subject: oldSettings.new_broker_email_subject,
    new_broker_email_content: oldSettings.new_broker_email_content,
    referrer_agreement_subject: oldSettings.referrer_agreement_subject,
    referrer_agreement_content: oldSettings.referrer_agreement_content,
    new_user_subject: oldSettings.new_user_subject,
    new_user_content: oldSettings.new_user_content,

    // Business settings
    terms_and_conditions: oldSettings.terms_conditions,
    default_interest_rate: oldSettings.interest_rate,
    commission_split: oldSettings.broker_retailer_information,
    referrer_fees: oldSettings.referrer_fee_content,
    new_broker_alert: oldSettings.new_broker_alert,
  };

  if (existing) {
    console.log('Updating existing settings...');
    const { error } = await supabase
      .from('global_settings')
      .update(settingsData)
      .eq('id', existing.id);

    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    console.log('Settings updated successfully');
  } else {
    console.log('Creating new settings...');
    const { error } = await supabase
      .from('global_settings')
      .insert(settingsData);

    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    console.log('Settings created successfully');
  }

  console.log('\n========================================');
  console.log('Global settings migration complete!');
}

migrateGlobalSettings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
