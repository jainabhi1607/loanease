import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface User {
  _id: string;
  email: string;
  password_hash?: string;
  organisation_id: string | null;
  role: 'super_admin' | 'admin_team' | 'referrer_admin' | 'referrer_team' | 'client';
  first_name: string;
  surname: string;
  phone: string | null;
  position: string | null;
  two_fa_enabled: boolean;
  two_fa_verified_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  deleted_at: string | null;
  status: string;
  state: string | null;
  is_active: boolean;
  email_verified?: boolean;
  must_reset_password?: boolean;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  const user = await db.collection<User>('users').findOne({ _id: id as any });
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  const user = await db.collection<User>('users').findOne({
    email: email.toLowerCase(),
    deleted_at: null
  });
  return user;
}

export async function findAllUsers(filters?: {
  role?: string;
  organisation_id?: string;
  is_active?: boolean;
}): Promise<User[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };

  if (filters?.role) query.role = filters.role;
  if (filters?.organisation_id) query.organisation_id = filters.organisation_id;
  if (filters?.is_active !== undefined) query.is_active = filters.is_active;

  const users = await db.collection<User>('users')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
  return users;
}

export async function findUsersByOrganisation(organisationId: string): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection<User>('users')
    .find({ organisation_id: organisationId, deleted_at: null })
    .sort({ created_at: -1 })
    .toArray();
  return users;
}

export async function findUsersByIds(ids: string[]): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection<User>('users')
    .find({ _id: { $in: ids as any } })
    .toArray();
  return users;
}

// Create user with full data object (including optional _id)
export async function createUser(data: Partial<User> & { email: string; role: User['role']; first_name: string; surname: string; created_at: string }): Promise<User> {
  const db = await getDatabase();
  const id = data._id || new ObjectId().toString();
  const user: User = {
    _id: id,
    email: data.email.toLowerCase(),
    password_hash: data.password_hash,
    organisation_id: data.organisation_id || null,
    role: data.role,
    first_name: data.first_name,
    surname: data.surname,
    phone: data.phone || null,
    position: data.position || null,
    two_fa_enabled: data.two_fa_enabled || false,
    two_fa_verified_at: data.two_fa_verified_at || null,
    last_login_at: data.last_login_at || null,
    last_login_ip: data.last_login_ip || null,
    created_at: data.created_at,
    deleted_at: data.deleted_at || null,
    status: data.status || 'active',
    state: data.state || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
    email_verified: data.email_verified || false,
    must_reset_password: data.must_reset_password || false
  };
  await db.collection<User>('users').insertOne(user);
  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const db = await getDatabase();
  const result = await db.collection<User>('users').findOneAndUpdate(
    { _id: id as any },
    { $set: data },
    { returnDocument: 'after' }
  );
  return result;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('users').updateOne(
    { _id: id as any },
    { $set: { password_hash: passwordHash, must_reset_password: false } }
  );
  return result.modifiedCount > 0;
}

export async function updateLastLogin(id: string, ip: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('users').updateOne(
    { _id: id as any },
    { $set: { last_login_at: new Date().toISOString(), last_login_ip: ip } }
  );
}

export async function softDeleteUser(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('users').updateOne(
    { _id: id as any },
    { $set: { deleted_at: new Date().toISOString(), is_active: false } }
  );
  return result.modifiedCount > 0;
}

export async function countUsers(filters?: { organisation_id?: string; role?: string }): Promise<number> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };
  if (filters?.organisation_id) query.organisation_id = filters.organisation_id;
  if (filters?.role) query.role = filters.role;
  return db.collection('users').countDocuments(query);
}
