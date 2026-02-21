import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

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
  acn: string | null;
  industry_type: number | null;
  trading_name: string | null;
  state: string | null;
  role: number | null;
  status: number | null;
}

interface OldUserDetails {
  id: number;
  user_id: number;
  address: string | null;
  ip_address: string | null;
  date_time: string | null;
  custom_commission_split: string | null;
}

// SQL Parsing functions
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

// Mappings
const industryTypeMap: Record<number, string> = {
  1: 'accounting', 2: 'agriculture', 3: 'automotive', 4: 'construction',
  5: 'education', 6: 'finance', 7: 'healthcare', 8: 'hospitality',
  9: 'information_technology', 10: 'legal', 11: 'manufacturing',
  12: 'real_estate', 13: 'retail', 14: 'other',
};

// loan_type mapping from old system
const loanTypeMap: Record<number, string> = {
  1: 'construction',
  2: 'lease_doc',
  3: 'low_doc',
  4: 'private_short_term',
  5: 'unsure',
};

// type_of_asset -> asset_type
const assetTypeMap: Record<number, string> = {
  1: 'commercial_property',
  2: 'residential_property',
  3: 'vacant_land',
};

// loan_purpose mapping from old system
const loanPurposeMap: Record<number, string> = {
  1: 'purchase_owner_occupier',  // Purchase - Owner Occupier
  3: 'purchase_investment',       // Purchase - Investment
  5: 'refinance',                 // Refinance
  7: 'equity_release',            // Equity Release
  9: 'land_bank',                 // Land Bank
  11: 'business_use',             // Business Use
  13: 'commercial_equipment',     // Commercial Equipment
};

// Industry type mapping
const industryTypeMapNew: Record<number, string> = {
  1: 'arts_and_lifestyle',
  2: 'building_and_trade',
  3: 'financial_services',
  4: 'hair_and_beauty',
  5: 'health',
  6: 'hospitality',
  7: 'manufacturing',
  8: 'agriculture',
  9: 'real_estate',
  10: 'services',
  11: 'professional_services',
  12: 'retail',
  13: 'transport_automotive',
  14: 'wholesaling',
};

function mapRole(oldRole: number | null, email: string | null): string {
  if (email === 'admin@loanease.com' || email === 'luay@duofinance.com.au') {
    return 'super_admin';
  }
  switch (oldRole) {
    case 1: case 2: return 'admin_team';
    case 3: return 'referrer_admin';
    case 4: case 7: return 'referrer_team';
    case 9: return 'client';
    default: return 'referrer_team';
  }
}

function mapStatus(app: any): string {
  if (app.date_settled && app.status === 20) return 'settled';
  if (app.status === 10) return 'declined';
  if (app.status === 2) return 'draft';
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

// Read SQL file helper
function readSqlFile(filename: string): string {
  const filePath = path.join(process.cwd(), 'migration', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

// Save/Load mappings
function saveMappings(name: string, data: any[]) {
  const dir = path.join(process.cwd(), 'migration', 'id_mappings');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));
}

function loadMappings(name: string): any[] {
  const filePath = path.join(process.cwd(), 'migration', 'id_mappings', `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function POST(request: NextRequest) {
  const { step } = await request.json();
  const db = await getDatabase();
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    switch (step) {
      case 'clear_all': {
        log('Starting full data clear...');

        // Delete in reverse order due to FK dependencies
        // 1. Comments (depends on opportunities)
        const deletedComments = await db.collection(COLLECTIONS.COMMENTS).deleteMany({});
        log(`Deleted ${deletedComments.deletedCount || 0} comments`);

        // 2. Opportunity details (depends on opportunities)
        const deletedDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).deleteMany({});
        log(`Deleted ${deletedDetails.deletedCount || 0} opportunity details`);

        // 3. Opportunities (depends on clients, organisations)
        const deletedOpps = await db.collection(COLLECTIONS.OPPORTUNITIES).deleteMany({});
        log(`Deleted ${deletedOpps.deletedCount || 0} opportunities`);

        // 4. Clients (depends on organisations)
        const deletedClients = await db.collection(COLLECTIONS.CLIENTS).deleteMany({});
        log(`Deleted ${deletedClients.deletedCount || 0} clients`);

        // 5. Organisation directors (depends on organisations)
        const deletedDirectors = await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS).deleteMany({});
        log(`Deleted ${deletedDirectors.deletedCount || 0} directors`);

        // 6. Organisation details (depends on organisations)
        const deletedOrgDetails = await db.collection(COLLECTIONS.ORGANISATION_DETAILS).deleteMany({});
        log(`Deleted ${deletedOrgDetails.deletedCount || 0} organisation details`);

        // 7. Delete users (except super_admin to keep login)
        // First get super_admin emails to preserve
        const superAdmins = await db.collection(COLLECTIONS.USERS)
          .find({ role: 'super_admin' })
          .toArray();

        const superAdminIds = superAdmins?.map(u => u._id) || [];
        const superAdminEmails = superAdmins?.map(u => u.email?.toLowerCase()) || [];
        log(`Preserving ${superAdminIds.length} super admin(s)`);

        // Delete non-super_admin users from users collection
        const deletedUsers = await db.collection(COLLECTIONS.USERS).deleteMany({
          role: { $ne: 'super_admin' }
        });
        log(`Deleted ${deletedUsers.deletedCount || 0} users from users collection`);

        // Delete auth users (except super admins)
        const authUsers = await db.collection(COLLECTIONS.AUTH_USERS).find({}).toArray();
        let authDeletedCount = 0;
        for (const authUser of authUsers) {
          if (!superAdminEmails.includes(authUser.email?.toLowerCase() || '')) {
            await db.collection(COLLECTIONS.AUTH_USERS).deleteOne({ _id: authUser._id });
            authDeletedCount++;
          }
        }
        log(`Deleted ${authDeletedCount} auth users`);

        // 8. Organisations
        const deletedOrgs = await db.collection(COLLECTIONS.ORGANISATIONS).deleteMany({});
        log(`Deleted ${deletedOrgs.deletedCount || 0} organisations`);

        // 9. Pre-assessment contacts
        const deletedPreAssess = await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS).deleteMany({});
        log(`Deleted ${deletedPreAssess.deletedCount || 0} pre-assessment contacts`);

        // 10. Audit logs (optional - clear migration-related logs)
        const deletedAudit = await db.collection(COLLECTIONS.AUDIT_LOGS).deleteMany({});
        log(`Deleted ${deletedAudit.deletedCount || 0} audit logs`);

        // 11. Clear ID mapping files
        const mappingsDir = path.join(process.cwd(), 'migration', 'id_mappings');
        if (fs.existsSync(mappingsDir)) {
          const files = fs.readdirSync(mappingsDir);
          for (const file of files) {
            fs.unlinkSync(path.join(mappingsDir, file));
            log(`Deleted mapping file: ${file}`);
          }
        }

        log('Data clear complete!');
        return NextResponse.json({ success: true, logs });
      }

      case 'organisations': {
        log('Starting organisations migration...');
        const usersSql = readSqlFile('loanease_staging_db_table_users.sql');
        const userDetailsSql = readSqlFile('loanease_staging_db_table_user_details.sql');
        const users = parseInsertStatements(usersSql);
        const userDetails = parseInsertStatements(userDetailsSql);

        const userDetailsMap = new Map();
        userDetails.forEach((ud: any) => userDetailsMap.set(ud.user_id, ud));

        // Include users who are org owners:
        // - role=3 (referrer_admin) with admin_id=NULL
        // - role=4 (referrer user) with admin_id=NULL and company_name (they can also create clients/opportunities)
        const orgOwners = users.filter((u: any) =>
          (u.role === 3 && u.admin_id === null) ||
          (u.role === 4 && u.admin_id === null && u.company_name?.trim())
        );

        log(`Found ${orgOwners.length} organisation owners (role=3, admin_id=null)`);
        const idMapping: any[] = [];

        for (const owner of orgOwners) {
          const details = userDetailsMap.get(owner.id);
          const cleanAbn = owner.abn?.replace(/\s/g, '') || `LEGACY-${owner.id}`;

          // Use company_name if available, otherwise construct from user name or email
          const companyName = owner.company_name?.trim()
            || `${owner.name || ''} ${owner.last_name || ''}`.trim()
            || owner.email?.split('@')[0]
            || `Legacy Org ${owner.id}`;

          const orgData: Record<string, any> = {
            company_name: companyName,
            abn: cleanAbn,
            trading_name: owner.trading_name || null,
            phone: owner.phone || null,
            address: details?.address || null,
            industry_type: owner.industry_type || null,
            state: owner.state || null,
            created_at: new Date(),
          };

          // Check if org already exists
          const existing = await db.collection(COLLECTIONS.ORGANISATIONS).findOne({
            $or: [
              { abn: orgData.abn },
              { company_name: companyName }
            ]
          });

          if (existing) {
            log(`Skipped (exists): ${companyName} (user_id: ${owner.id})`);
            idMapping.push({ old_user_id: owner.id, new_org_id: existing._id, company_name: companyName });
            continue;
          }

          const newOrgId = new ObjectId().toString();
          await db.collection(COLLECTIONS.ORGANISATIONS).insertOne({
            _id: newOrgId as any,
            ...orgData,
          });

          log(`Created: ${companyName} (user_id: ${owner.id})`);
          idMapping.push({ old_user_id: owner.id, new_org_id: newOrgId, company_name: companyName });
        }

        saveMappings('organisations', idMapping);
        return NextResponse.json({ success: true, logs, count: idMapping.length });
      }

      case 'users': {
        log('Starting users migration...');
        const usersSql = readSqlFile('loanease_staging_db_table_users.sql');
        const users = parseInsertStatements(usersSql);
        const orgMappings = loadMappings('organisations');

        // Include ALL users with valid emails (not just status=1)
        const validUsers = users.filter((u: any) => u.email?.trim());
        log(`Found ${validUsers.length} valid users (all statuses)`);

        // Load all existing auth users once
        const existingAuthUsers: Map<string, string> = new Map(); // email -> id
        const authUsersList = await db.collection(COLLECTIONS.AUTH_USERS).find({}).toArray();
        for (const authUser of authUsersList) {
          if (authUser.email) {
            existingAuthUsers.set(authUser.email.toLowerCase(), String(authUser._id));
          }
        }
        log(`Found ${existingAuthUsers.size} existing auth users`);

        const userMappings: any[] = [];

        const findOrgForUser = (userId: number): string | null => {
          const direct = orgMappings.find((m: any) => m.old_user_id === userId);
          if (direct) return direct.new_org_id;
          const user = users.find((u: any) => u.id === userId);
          if (user?.admin_id) return findOrgForUser(user.admin_id);
          return null;
        };

        for (const user of validUsers) {
          const email = user.email.toLowerCase().trim();
          const role = mapRole(user.role, email);
          const organisationId = findOrgForUser(user.id);

          // Check if auth user exists
          const existingUserId = existingAuthUsers.get(email);

          let authUserId: string;

          if (existingUserId) {
            authUserId = existingUserId;
            log(`Auth exists: ${email}`);
          } else {
            const tempPassword = Math.random().toString(36).slice(-16) + 'A1!';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            authUserId = new ObjectId().toString();

            await db.collection(COLLECTIONS.AUTH_USERS).insertOne({
              _id: authUserId as any,
              email,
              password_hash: hashedPassword,
              email_confirmed: true,
              user_metadata: { migrated: true, old_id: user.id },
              created_at: new Date(),
            });
            log(`Created auth: ${email}`);
          }

          // Check if profile exists
          const existingProfile = await db.collection(COLLECTIONS.USERS).findOne({ _id: authUserId as any });

          if (existingProfile) {
            userMappings.push({ old_id: user.id, new_id: authUserId, email, role });
            continue;
          }

          await db.collection(COLLECTIONS.USERS).insertOne({
            _id: authUserId as any,
            email,
            first_name: user.name || 'Unknown',
            surname: user.last_name || '',
            phone: user.phone || null,
            role,
            organisation_id: organisationId,
            created_at: new Date(),
          });

          log(`Created profile: ${email}`);
          userMappings.push({ old_id: user.id, new_id: authUserId, email, role });
        }

        saveMappings('users', userMappings);
        return NextResponse.json({ success: true, logs, count: userMappings.length });
      }

      case 'directors': {
        log('Starting directors migration...');
        const directorsSql = readSqlFile('loanease_staging_db_table_directors.sql');
        const usersSql = readSqlFile('loanease_staging_db_table_users.sql');
        const directors = parseInsertStatements(directorsSql);
        const users = parseInsertStatements(usersSql);
        const orgMappings = loadMappings('organisations');

        // Helper to find org for any user (including team members)
        const findOrgForUser = (userId: number | null): string | null => {
          if (!userId) return null;
          const direct = orgMappings.find((m: any) => m.old_user_id === userId);
          if (direct) return direct.new_org_id;
          const user = users.find((u: any) => u.id === userId);
          if (user?.admin_id) return findOrgForUser(user.admin_id);
          return null;
        };

        let count = 0;
        let skipped = 0;
        for (const director of directors) {
          if (!director.name?.trim()) {
            skipped++;
            continue;
          }

          const organisationId = findOrgForUser(director.user_id);
          if (!organisationId) {
            log(`Skipped director (no org mapping): ${director.name} ${director.last_name || ''} (user_id: ${director.user_id})`);
            skipped++;
            continue;
          }

          const existing = await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS).findOne({
            organisation_id: organisationId,
            first_name: director.name,
          });

          if (existing) {
            log(`Skipped (exists): ${director.name} ${director.last_name || ''}`);
            continue;
          }

          await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS).insertOne({
            _id: new ObjectId().toString() as any,
            organisation_id: organisationId,
            first_name: director.name.trim(),
            surname: (director.last_name || '').trim(),
            created_at: new Date(),
          });

          log(`Created: ${director.name} ${director.last_name || ''}`);
          count++;
        }

        log(`Directors: ${count} created, ${skipped} skipped`);
        return NextResponse.json({ success: true, logs, count });
      }

      case 'clients': {
        log('Starting clients migration...');
        const clientsSql = readSqlFile('loanease_staging_db_table_clients.sql');
        const clientDetailsSql = readSqlFile('loanease_staging_db_table_client_details.sql');
        const usersSql = readSqlFile('loanease_staging_db_table_users.sql');

        const clients = parseInsertStatements(clientsSql);
        const clientDetails = parseInsertStatements(clientDetailsSql);
        const users = parseInsertStatements(usersSql);
        const orgMappings = loadMappings('organisations');
        const userMappings = loadMappings('users');

        log(`Loaded ${clients.length} clients from SQL`);
        log(`Loaded ${orgMappings.length} org mappings`);
        log(`Loaded ${userMappings.length} user mappings`);

        const clientDetailsMap = new Map();
        clientDetails.forEach((cd: any) => { if (cd.client_id) clientDetailsMap.set(cd.client_id, cd); });

        const findOrgForUser = (userId: number | null): string | null => {
          if (!userId) return null;
          // Direct lookup by user_id
          const direct = orgMappings.find((m: any) => m.old_user_id === userId);
          if (direct) return direct.new_org_id;
          // Try to trace up via admin_id
          const user = users.find((u: any) => u.id === userId);
          if (user?.admin_id) return findOrgForUser(user.admin_id);
          // Fallback: try to match by company_name
          if (user?.company_name?.trim()) {
            const byName = orgMappings.find((m: any) =>
              m.company_name?.toLowerCase() === user.company_name.trim().toLowerCase()
            );
            if (byName) return byName.new_org_id;
          }
          return null;
        };

        // Get a fallback user (first super_admin) for clients without a valid created_by
        const fallbackUser = await db.collection(COLLECTIONS.USERS)
          .findOne({ role: 'super_admin' });
        const fallbackUserId = fallbackUser?._id || null;
        log(`Fallback user ID: ${fallbackUserId || 'none'}`);

        // Get or create a fallback organisation for clients without org mapping
        let fallbackOrgId: string | null = null;
        const existingFallbackOrg = await db.collection(COLLECTIONS.ORGANISATIONS)
          .findOne({ company_name: 'Legacy Migration Org' });

        if (existingFallbackOrg) {
          fallbackOrgId = String(existingFallbackOrg._id);
        } else {
          fallbackOrgId = new ObjectId().toString();
          await db.collection(COLLECTIONS.ORGANISATIONS).insertOne({
            _id: fallbackOrgId as any,
            company_name: 'Legacy Migration Org',
            abn: 'LEGACY-FALLBACK',
            created_at: new Date(),
          });
        }
        log(`Fallback org ID: ${fallbackOrgId || 'none'}`);

        const clientMappings: any[] = [];
        let skipped = 0;

        for (const client of clients) {
          let organisationId = findOrgForUser(client.user_id);

          // Use fallback org if no org mapping found
          if (!organisationId) {
            organisationId = fallbackOrgId;
            log(`Using fallback org for client: ${client.first_name} ${client.last_name} (user_id: ${client.user_id})`);
          }

          if (!organisationId) {
            log(`Skipped client (no org and no fallback): ${client.first_name} ${client.last_name}`);
            skipped++;
            continue;
          }

          const createdByMapping = userMappings.find((m: any) => m.old_id === client.user_id);
          const createdBy = createdByMapping?.new_id || fallbackUserId;

          if (!createdBy) {
            log(`Skipped client (no created_by): ${client.first_name} ${client.last_name}`);
            skipped++;
            continue;
          }

          const details = clientDetailsMap.get(client.id);
          const entityName = client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown';

          const existing = await db.collection(COLLECTIONS.CLIENTS).findOne({
            organisation_id: organisationId,
            entity_name: entityName,
          });

          if (existing) {
            clientMappings.push({ old_id: client.id, new_id: existing._id, entity_name: entityName });
            continue;
          }

          // ABN is required - generate a placeholder if missing
          const clientAbn = client.abn?.trim() || `LEGACY-CLIENT-${client.id}`;

          // Check for duplicate ABN and make unique if needed
          let attempts = 0;
          const maxAttempts = 10;
          let abnToUse = clientAbn;

          while (attempts < maxAttempts) {
            const abnExists = await db.collection(COLLECTIONS.CLIENTS).findOne({ abn: abnToUse });
            if (!abnExists) break;
            attempts++;
            abnToUse = `${clientAbn}-${attempts}`;
          }

          const newClientId = new ObjectId().toString();
          await db.collection(COLLECTIONS.CLIENTS).insertOne({
            _id: newClientId as any,
            organisation_id: organisationId,
            entity: client.entity || null,
            entity_name: entityName,
            contact_first_name: client.first_name || null,
            contact_last_name: client.last_name || null,
            contact_phone: client.mobile || null,
            contact_email: client.email || null,
            abn: abnToUse,
            created_by: createdBy,
            created_at: new Date(),
          });

          if (attempts > 0) {
            log(`Created with ABN suffix: ${entityName} (ABN: ${abnToUse})`);
          } else {
            log(`Created: ${entityName}`);
          }
          clientMappings.push({ old_id: client.id, new_id: newClientId, entity_name: entityName });
        }

        log(`Clients: ${clientMappings.length} created, ${skipped} skipped`);
        saveMappings('clients', clientMappings);
        return NextResponse.json({ success: true, logs, count: clientMappings.length });
      }

      case 'opportunities': {
        log('Starting opportunities migration...');
        const appsSql = readSqlFile('loanease_staging_db_table_applications.sql');
        const usersSql = readSqlFile('loanease_staging_db_table_users.sql');

        const applications = parseInsertStatements(appsSql);
        const users = parseInsertStatements(usersSql);
        const orgMappings = loadMappings('organisations');
        const userMappings = loadMappings('users');
        const clientMappings = loadMappings('clients');

        log(`Loaded ${applications.length} applications from SQL`);
        log(`Loaded ${orgMappings.length} org mappings`);
        log(`Loaded ${userMappings.length} user mappings`);
        log(`Loaded ${clientMappings.length} client mappings`);

        const findOrgForUser = (userId: number | null): string | null => {
          if (!userId) return null;
          // Direct lookup by user_id
          const direct = orgMappings.find((m: any) => m.old_user_id === userId);
          if (direct) return direct.new_org_id;
          // Try to trace up via admin_id
          const user = users.find((u: any) => u.id === userId);
          if (user?.admin_id) return findOrgForUser(user.admin_id);
          // Fallback: try to match by company_name
          if (user?.company_name?.trim()) {
            const byName = orgMappings.find((m: any) =>
              m.company_name?.toLowerCase() === user.company_name.trim().toLowerCase()
            );
            if (byName) return byName.new_org_id;
          }
          return null;
        };

        // Get a fallback user (first super_admin) for opportunities without a valid created_by
        const fallbackUser = await db.collection(COLLECTIONS.USERS)
          .findOne({ role: 'super_admin' });
        const fallbackUserId = fallbackUser?._id || null;
        log(`Fallback user ID: ${fallbackUserId || 'none'}`);

        // Get fallback organisation
        const fallbackOrg = await db.collection(COLLECTIONS.ORGANISATIONS)
          .findOne({ company_name: 'Legacy Migration Org' });
        const fallbackOrgId: string | null = fallbackOrg ? String(fallbackOrg._id) : null;
        log(`Fallback org ID: ${fallbackOrgId || 'none'}`);

        const oppMappings: any[] = [];
        let skipped = 0;

        for (const app of applications) {
          const clientMapping = clientMappings.find((m: any) => m.old_id === app.client_id);
          if (!clientMapping) {
            log(`Skipped opp (no client mapping): app_id ${app.id}, client_id ${app.client_id}`);
            skipped++;
            continue;
          }

          let organisationId = app.referrer_group ? findOrgForUser(app.referrer_group) : null;
          if (!organisationId && app.user_id) organisationId = findOrgForUser(app.user_id);

          // Use fallback org if no org mapping found
          if (!organisationId) {
            organisationId = fallbackOrgId;
            log(`Using fallback org for opp: app_id ${app.id}`);
          }

          if (!organisationId) {
            log(`Skipped opp (no org and no fallback): app_id ${app.id}`);
            skipped++;
            continue;
          }

          const createdByMapping = userMappings.find((m: any) => m.old_id === app.user_id);
          const createdBy = createdByMapping?.new_id || fallbackUserId;

          if (!createdBy) {
            log(`Skipped opp (no created_by): app_id ${app.id}`);
            skipped++;
            continue;
          }

          const oppId = app.application_id || `LEGACY-${app.id}`;

          const existing = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
            opportunity_id: oppId,
          });

          if (existing) {
            oppMappings.push({ old_id: app.id, new_id: existing._id, opportunity_id: oppId });
            continue;
          }

          const newOppId = new ObjectId().toString();
          await db.collection(COLLECTIONS.OPPORTUNITIES).insertOne({
            _id: newOppId as any,
            opportunity_id: oppId,
            organization_id: organisationId,
            client_id: clientMapping.new_id,
            status: mapStatus(app),
            loan_type: app.loan_type ? loanTypeMap[app.loan_type] : null,
            asset_type: app.type_of_asset ? assetTypeMap[app.type_of_asset] : null,
            loan_amount: app.loan_amount || null,
            property_value: app.estimated_property_value ? parseFloat(app.estimated_property_value) : null,
            loan_purpose: app.loan_purpose ? loanPurposeMap[app.loan_purpose] : null,
            external_ref: app.deal_id || null,
            target_settlement_date: app.target_settlement_date || null,
            date_settled: app.date_settled || null,
            created_by: createdBy,
            created_at: new Date(),
          });

          log(`Created: ${oppId}`);
          oppMappings.push({ old_id: app.id, new_id: newOppId, opportunity_id: oppId });
        }

        log(`Opportunities: ${oppMappings.length} created, ${skipped} skipped`);
        saveMappings('opportunities', oppMappings);
        return NextResponse.json({ success: true, logs, count: oppMappings.length });
      }

      case 'opportunity_details': {
        log('Starting opportunity details migration...');
        const detailsSql = readSqlFile('loanease_staging_db_table_application_details.sql');
        const appDetails = parseInsertStatements(detailsSql);
        const oppMappings = loadMappings('opportunities');

        let count = 0;
        for (const details of appDetails) {
          const oppMapping = oppMappings.find((m: any) => m.old_id === details.application_id);
          if (!oppMapping) continue;

          const existing = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({
            opportunity_id: oppMapping.new_id,
          });

          if (existing) continue;

          const isUnqualified = details.disqualify_reason?.trim() ? 1 : 0;

          await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).insertOne({
            _id: new ObjectId().toString() as any,
            opportunity_id: oppMapping.new_id,
            address: details.address || null,
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
            created_at: new Date(),
          });

          log(`Created details for: ${oppMapping.opportunity_id}`);
          count++;
        }

        return NextResponse.json({ success: true, logs, count });
      }

      case 'comments': {
        log('Starting comments migration...');
        const commentsSql = readSqlFile('loanease_staging_db_table_application_comments.sql');
        const comments = parseInsertStatements(commentsSql);
        const oppMappings = loadMappings('opportunities');
        const userMappings = loadMappings('users');

        let count = 0;
        for (const comment of comments) {
          if (!comment.comments?.trim()) continue;

          const oppMapping = oppMappings.find((m: any) => m.old_id === comment.application_id);
          const userMapping = userMappings.find((m: any) => m.old_id === comment.user_id);
          if (!oppMapping || !userMapping) continue;

          await db.collection(COLLECTIONS.COMMENTS).insertOne({
            _id: new ObjectId().toString() as any,
            opportunity_id: oppMapping.new_id,
            user_id: userMapping.new_id,
            comment: comment.comments.trim(),
            is_public: true,
            created_at: comment.date_time ? new Date(comment.date_time) : new Date(),
          });

          log(`Created comment for: ${oppMapping.opportunity_id}`);
          count++;
        }

        return NextResponse.json({ success: true, logs, count });
      }

      case 'pre_assessment': {
        log('Starting pre-assessment contacts migration...');
        const contactsSql = readSqlFile('loanease_staging_db_table_contact_details.sql');
        const contacts = parseInsertStatements(contactsSql);

        let count = 0;
        for (const contact of contacts) {
          const existing = await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS).findOne({
            email: contact.email || '',
          });

          if (existing) continue;

          await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS).insertOne({
            _id: new ObjectId().toString() as any,
            first_name: contact.first_name || null,
            last_name: contact.last_name || null,
            email: contact.email || null,
            phone: contact.phone || null,
            ip_address: contact.ip_address || null,
            created_at: contact.date_time ? new Date(contact.date_time) : new Date(),
          });

          log(`Created: ${contact.first_name} ${contact.last_name}`);
          count++;
        }

        return NextResponse.json({ success: true, logs, count });
      }

      case 'global_settings': {
        log('Starting global settings migration...');
        const settingsSql = readSqlFile('loanease_staging_db_table_global_settings.sql');
        const settings = parseInsertStatements(settingsSql);

        if (settings.length === 0) {
          return NextResponse.json({ success: true, logs: ['No settings found'], count: 0 });
        }

        const oldSettings = settings[0];
        const settingsData: Record<string, any> = {
          new_signup_email_subject: oldSettings.new_signup_email_subject,
          new_signup_email_content: oldSettings.new_signup_email_content,
          new_broker_email_subject: oldSettings.new_broker_email_subject,
          new_broker_email_content: oldSettings.new_broker_email_content,
          referrer_agreement_subject: oldSettings.referrer_agreement_subject,
          referrer_agreement_content: oldSettings.referrer_agreement_content,
          new_user_subject: oldSettings.new_user_subject,
          new_user_content: oldSettings.new_user_content,
          terms_and_conditions: oldSettings.terms_conditions,
          default_interest_rate: oldSettings.interest_rate,
          commission_split: oldSettings.broker_retailer_information,
          referrer_fees: oldSettings.referrer_fee_content,
          new_broker_alert: oldSettings.new_broker_alert,
        };

        // Convert to key-value pairs for new schema
        for (const [key, value] of Object.entries(settingsData)) {
          if (value !== undefined && value !== null) {
            await db.collection(COLLECTIONS.GLOBAL_SETTINGS).updateOne(
              { key },
              {
                $set: {
                  key,
                  value: typeof value === 'string' ? value : JSON.stringify(value),
                  updated_at: new Date(),
                },
              },
              { upsert: true }
            );
          }
        }
        log('Created/Updated settings');

        return NextResponse.json({ success: true, logs, count: 1 });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown step' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
  }
}
