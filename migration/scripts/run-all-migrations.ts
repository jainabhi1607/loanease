/**
 * Main Migration Runner
 *
 * Runs all migration scripts in the correct order
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migration/scripts/run-all-migrations.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const scriptsDir = __dirname;

const migrations = [
  { name: 'Organisations', script: 'migrate-organisations.ts' },
  { name: 'Users', script: 'migrate-users.ts' },
  { name: 'Directors', script: 'migrate-directors.ts' },
  { name: 'Clients', script: 'migrate-clients.ts' },
  { name: 'Opportunities', script: 'migrate-opportunities.ts' },
  { name: 'Opportunity Details', script: 'migrate-opportunity-details.ts' },
  { name: 'Comments', script: 'migrate-comments.ts' },
  { name: 'Pre-Assessment Contacts', script: 'migrate-pre-assessment-contacts.ts' },
  { name: 'Global Settings', script: 'migrate-global-settings.ts' },
];

async function runMigrations() {
  console.log('='.repeat(60));
  console.log('CLUE FINANCE - DATA MIGRATION');
  console.log('CakePHP (MySQL) → Supabase (PostgreSQL)');
  console.log('='.repeat(60));
  console.log('');

  // Create id_mappings directory if it doesn't exist
  const mappingsDir = path.join(__dirname, '..', 'id_mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
    console.log('Created id_mappings directory\n');
  }

  const results: { name: string; status: 'success' | 'failed'; error?: string }[] = [];

  for (const migration of migrations) {
    console.log('');
    console.log('='.repeat(60));
    console.log(`RUNNING: ${migration.name}`);
    console.log('='.repeat(60));
    console.log('');

    const scriptPath = path.join(scriptsDir, migration.script);

    try {
      execSync(
        `npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\"}" "${scriptPath}"`,
        {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..', '..'),
        }
      );
      results.push({ name: migration.name, status: 'success' });
    } catch (error: any) {
      console.error(`\nFailed: ${migration.name}`);
      results.push({
        name: migration.name,
        status: 'failed',
        error: error.message || 'Unknown error',
      });
      // Continue with next migration instead of stopping
      console.log('Continuing with next migration...\n');
    }
  }

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('');

  if (successful.length > 0) {
    console.log('Successful migrations:');
    successful.forEach(r => console.log(`  ✓ ${r.name}`));
    console.log('');
  }

  if (failed.length > 0) {
    console.log('Failed migrations:');
    failed.forEach(r => console.log(`  ✗ ${r.name}: ${r.error}`));
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('');
  console.log('IMPORTANT: All migrated users need to reset their passwords!');
  console.log('Use the password reset flow in the application.');
  console.log('');

  // Exit with error code if any migration failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
