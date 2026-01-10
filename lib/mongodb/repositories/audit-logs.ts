import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface AuditLog {
  _id: string;
  table_name: string;
  record_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function findAuditLogsByRecord(recordId: string, tableName?: string): Promise<AuditLog[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { record_id: recordId };
  if (tableName) query.table_name = tableName;

  return db.collection<AuditLog>('audit_logs')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function findAuditLogsWithUsers(recordId: string, tableName?: string): Promise<Array<AuditLog & { user?: { first_name: string; surname: string } }>> {
  const db = await getDatabase();
  const matchStage: Record<string, unknown> = { record_id: recordId };
  if (tableName) matchStage.table_name = tableName;

  return db.collection('audit_logs').aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user_array'
      }
    },
    {
      $addFields: {
        user: { $arrayElemAt: ['$user_array', 0] }
      }
    },
    { $unset: 'user_array' },
    {
      $project: {
        _id: 1,
        table_name: 1,
        record_id: 1,
        action: 1,
        field_name: 1,
        old_value: 1,
        new_value: 1,
        description: 1,
        user_id: 1,
        ip_address: 1,
        user_agent: 1,
        created_at: 1,
        'user.first_name': 1,
        'user.surname': 1
      }
    },
    { $sort: { created_at: -1 } }
  ]).toArray() as Promise<Array<AuditLog & { user?: { first_name: string; surname: string } }>>;
}

export async function createAuditLog(data: Omit<AuditLog, '_id'>): Promise<AuditLog> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const log: AuditLog = { _id: id, ...data };
  await db.collection<AuditLog>('audit_logs').insertOne(log);
  return log;
}

export async function logFieldChange(options: {
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  userId: string | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLog> {
  return createAuditLog({
    table_name: options.tableName,
    record_id: options.recordId,
    action: 'update',
    field_name: options.fieldName,
    old_value: options.oldValue != null ? String(options.oldValue) : null,
    new_value: options.newValue != null ? String(options.newValue) : null,
    description: `Updated ${options.fieldName}`,
    user_id: options.userId,
    ip_address: options.ipAddress || null,
    user_agent: options.userAgent || null,
    created_at: new Date().toISOString()
  });
}

export async function logAction(options: {
  tableName: string;
  recordId: string;
  action: string;
  description: string;
  userId: string | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLog> {
  return createAuditLog({
    table_name: options.tableName,
    record_id: options.recordId,
    action: options.action,
    field_name: null,
    old_value: null,
    new_value: null,
    description: options.description,
    user_id: options.userId,
    ip_address: options.ipAddress || null,
    user_agent: options.userAgent || null,
    created_at: new Date().toISOString()
  });
}
