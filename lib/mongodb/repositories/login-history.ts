import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface LoginHistory {
  _id: string;
  user_id: string | null;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
}

export async function findLoginHistoryByUser(userId: string, limit: number = 50): Promise<LoginHistory[]> {
  const db = await getDatabase();
  return db.collection<LoginHistory>('login_history')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

export async function findLoginHistoryByEmail(email: string, limit: number = 50): Promise<LoginHistory[]> {
  const db = await getDatabase();
  return db.collection<LoginHistory>('login_history')
    .find({ email: email.toLowerCase() })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

export async function findLoginHistoryByUserOrEmail(userId: string, email: string, limit: number = 50): Promise<LoginHistory[]> {
  const db = await getDatabase();
  return db.collection<LoginHistory>('login_history')
    .find({
      $or: [
        { user_id: userId },
        { email: email.toLowerCase() }
      ]
    })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

export async function createLoginHistory(data: Omit<LoginHistory, '_id'>): Promise<LoginHistory> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const entry: LoginHistory = { _id: id, ...data };
  await db.collection<LoginHistory>('login_history').insertOne(entry);
  return entry;
}

export async function logSuccessfulLogin(userId: string, email: string, ipAddress: string, userAgent: string): Promise<LoginHistory> {
  return createLoginHistory({
    user_id: userId,
    email: email.toLowerCase(),
    status: 'success',
    ip_address: ipAddress,
    user_agent: userAgent,
    failure_reason: null,
    created_at: new Date().toISOString()
  });
}

export async function logFailedLogin(email: string, ipAddress: string, userAgent: string, reason: string): Promise<LoginHistory> {
  return createLoginHistory({
    user_id: null,
    email: email.toLowerCase(),
    status: 'failed',
    ip_address: ipAddress,
    user_agent: userAgent,
    failure_reason: reason,
    created_at: new Date().toISOString()
  });
}

export async function logBlockedLogin(email: string, ipAddress: string, userAgent: string): Promise<LoginHistory> {
  return createLoginHistory({
    user_id: null,
    email: email.toLowerCase(),
    status: 'blocked',
    ip_address: ipAddress,
    user_agent: userAgent,
    failure_reason: 'Account temporarily locked due to too many failed attempts',
    created_at: new Date().toISOString()
  });
}

export async function countRecentFailedAttempts(email: string, minutes: number = 30): Promise<number> {
  const db = await getDatabase();
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  return db.collection('login_history').countDocuments({
    email: email.toLowerCase(),
    status: 'failed',
    created_at: { $gte: cutoff }
  });
}
