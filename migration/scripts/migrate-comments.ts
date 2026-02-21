/**
 * Migration Script: Comments
 *
 * Migrates application_comments to comments table
 * Must run AFTER migrate-opportunities.ts and migrate-users.ts
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/migrate-comments.ts
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

interface OldComment {
  id: number;
  application_id: number | null;
  comments: string | null;
  user_id: number | null;
  date_time: string | null;
}

interface OppMapping { old_id: number; new_id: string; opportunity_id: string; }
interface UserMapping { old_id: number; new_id: string; email: string; role: string; }

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

async function migrateComments() {
  console.log('Starting comments migration...\n');

  // Read SQL file
  const commentsPath = path.join(__dirname, '..', 'loanease_staging_db_table_application_comments.sql');
  const commentsSql = fs.readFileSync(commentsPath, 'utf-8');
  const comments = parseInsertStatements(commentsSql) as OldComment[];

  // Load mappings
  const mappingsDir = path.join(__dirname, '..', 'id_mappings');
  const oppMappings: OppMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'opportunities.json'), 'utf-8'));
  const userMappings: UserMapping[] = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'users.json'), 'utf-8'));

  console.log(`Found ${comments.length} comments`);
  console.log(`Loaded ${oppMappings.length} opportunity mappings`);
  console.log(`Loaded ${userMappings.length} user mappings\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const comment of comments) {
    // Skip empty comments
    if (!comment.comments || comment.comments.trim() === '') {
      skippedCount++;
      continue;
    }

    // Find opportunity mapping
    const oppMapping = oppMappings.find(m => m.old_id === comment.application_id);
    if (!oppMapping) {
      console.log(`Skipping comment for application_id ${comment.application_id} - no mapping`);
      skippedCount++;
      continue;
    }

    // Find user mapping
    const userMapping = userMappings.find(m => m.old_id === comment.user_id);
    if (!userMapping) {
      console.log(`Skipping comment - no user mapping for user_id ${comment.user_id}`);
      skippedCount++;
      continue;
    }

    console.log(`Migrating comment for opportunity: ${oppMapping.opportunity_id}`);

    // Prepare comment data
    const commentData = {
      opportunity_id: oppMapping.new_id,
      user_id: userMapping.new_id,
      comment: comment.comments.trim(),
      is_public: true,
      created_at: comment.date_time ? new Date(comment.date_time).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase
      .from('comments')
      .insert(commentData);

    if (error) {
      console.error(`  -> Error: ${error.message}\n`);
      continue;
    }

    console.log(`  -> Created\n`);
    migratedCount++;
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`Comments migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

migrateComments()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
