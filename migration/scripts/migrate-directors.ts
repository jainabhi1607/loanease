/**
 * Migration Script: Directors
 *
 * Migrates directors from old CakePHP to organisation_directors table
 * Must run AFTER migrate-organisations.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-directors.ts
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

interface OldDirector {
  id: number;
  user_id: number | null;
  name: string | null;
  last_name: string | null;
}

interface OrgMapping {
  old_user_id: number;
  new_org_id: string;
  company_name: string;
}

// Parse SQL (reused functions)
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

async function migrateDirectors() {
  console.log('Starting directors migration...\n');

  // Read SQL file
  const directorsPath = path.join(__dirname, '..', 'loanease_staging_db_table_directors.sql');
  const directorsSql = fs.readFileSync(directorsPath, 'utf-8');
  const directors = parseInsertStatements(directorsSql) as OldDirector[];

  // Load organisation mappings
  const orgMappingPath = path.join(__dirname, '..', 'id_mappings', 'organisations.json');
  if (!fs.existsSync(orgMappingPath)) {
    console.error('Organisation mappings not found. Run migrate-organisations.ts first.');
    process.exit(1);
  }
  const orgMappings: OrgMapping[] = JSON.parse(fs.readFileSync(orgMappingPath, 'utf-8'));

  console.log(`Found ${directors.length} directors`);
  console.log(`Loaded ${orgMappings.length} organisation mappings\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const director of directors) {
    // Skip if no name
    if (!director.name || director.name.trim() === '') {
      skippedCount++;
      continue;
    }

    // Find organisation mapping for this director's user_id
    const orgMapping = orgMappings.find(m => m.old_user_id === director.user_id);

    if (!orgMapping) {
      console.log(`Skipping director "${director.name}" - no org mapping for user_id: ${director.user_id}`);
      skippedCount++;
      continue;
    }

    console.log(`Migrating: ${director.name} ${director.last_name || ''} -> ${orgMapping.company_name}`);

    // Check if director already exists
    const { data: existing } = await supabase
      .from('organisation_directors')
      .select('id')
      .eq('organisation_id', orgMapping.new_org_id)
      .eq('first_name', director.name)
      .eq('last_name', director.last_name || '')
      .single();

    if (existing) {
      console.log(`  -> Already exists, skipping\n`);
      skippedCount++;
      continue;
    }

    // Insert director
    const { error } = await supabase
      .from('organisation_directors')
      .insert({
        organisation_id: orgMapping.new_org_id,
        first_name: director.name.trim(),
        last_name: (director.last_name || '').trim(),
      });

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created\n`);
    migratedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Directors migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

migrateDirectors()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
