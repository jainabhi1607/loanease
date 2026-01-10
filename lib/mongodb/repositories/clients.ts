import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface Client {
  _id: string;
  organisation_id: string;
  entity: number; // 1-6 entity type
  entity_name: string;
  abn: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  industry: string | null;
  address: string | null;
  created_at: string;
  deleted_at: string | null;
}

export async function findClientById(id: string): Promise<Client | null> {
  const db = await getDatabase();
  return db.collection<Client>('clients').findOne({ _id: id as any, deleted_at: null });
}

export async function findAllClients(filters?: {
  organisation_id?: string;
}): Promise<Client[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };
  if (filters?.organisation_id) query.organisation_id = filters.organisation_id;

  return db.collection<Client>('clients')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function findClientsByOrganisation(organisationId: string): Promise<Client[]> {
  const db = await getDatabase();
  return db.collection<Client>('clients')
    .find({ organisation_id: organisationId, deleted_at: null })
    .sort({ created_at: -1 })
    .toArray();
}

export async function findClientByABN(organisationId: string, abn: string): Promise<Client | null> {
  const db = await getDatabase();
  return db.collection<Client>('clients').findOne({
    organisation_id: organisationId,
    abn,
    deleted_at: null
  });
}

export async function findClientsByIds(ids: string[]): Promise<Client[]> {
  const db = await getDatabase();
  return db.collection<Client>('clients')
    .find({ _id: { $in: ids as any } })
    .toArray();
}

export async function createClient(data: Omit<Client, '_id'>): Promise<Client> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const client: Client = { _id: id, ...data };
  await db.collection<Client>('clients').insertOne(client);
  return client;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client | null> {
  const db = await getDatabase();
  return db.collection<Client>('clients').findOneAndUpdate(
    { _id: id as any },
    { $set: data },
    { returnDocument: 'after' }
  );
}

export async function softDeleteClient(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('clients').updateOne(
    { _id: id as any },
    { $set: { deleted_at: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function countClients(filters?: { organisation_id?: string }): Promise<number> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };
  if (filters?.organisation_id) query.organisation_id = filters.organisation_id;
  return db.collection('clients').countDocuments(query);
}

// Get client with opportunity count
export async function getClientWithOpportunityCount(clientId: string): Promise<{ client: Client; opportunityCount: number } | null> {
  const db = await getDatabase();
  const client = await findClientById(clientId);
  if (!client) return null;

  const opportunityCount = await db.collection('opportunities').countDocuments({
    client_id: clientId,
    deleted_at: null
  });

  return { client, opportunityCount };
}
