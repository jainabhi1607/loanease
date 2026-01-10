/**
 * Migration Script: Pre-Assessment Contacts
 *
 * Migrates contact_details to pre_assessment_contacts table
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-pre-assessment-contacts.ts
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

interface OldContactDetails {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_time: string | null;
  ip_address: string | null;
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

async function migratePreAssessmentContacts() {
  console.log('Starting pre-assessment contacts migration...\n');

  // Read SQL file
  const contactsPath = path.join(__dirname, '..', 'clue_staging_db_table_contact_details.sql');
  const contactsSql = fs.readFileSync(contactsPath, 'utf-8');
  const contacts = parseInsertStatements(contactsSql) as OldContactDetails[];

  console.log(`Found ${contacts.length} contacts\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const contact of contacts) {
    console.log(`Migrating: ${contact.first_name} ${contact.last_name} (${contact.email})`);

    // Check if contact already exists (by email and created_at)
    const { data: existing } = await supabase
      .from('pre_assessment_contacts')
      .select('id')
      .eq('email', contact.email || '')
      .single();

    if (existing) {
      console.log(`  -> Already exists, skipping\n`);
      skippedCount++;
      continue;
    }

    // Prepare contact data
    const contactData = {
      first_name: contact.first_name || null,
      last_name: contact.last_name || null,
      email: contact.email || null,
      phone: contact.phone || null,
      ip_address: contact.ip_address || null,
      created_at: contact.date_time ? new Date(contact.date_time).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase
      .from('pre_assessment_contacts')
      .insert(contactData);

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created\n`);
    migratedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Contacts migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

migratePreAssessmentContacts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
