import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface Organisation {
  _id: string;
  company_name: string;
  trading_name: string | null;
  abn: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  entity_type?: string | null;
  industry_type?: string | null;
  industry?: string | null;
  is_active: boolean;
  agreement_ip: string | null;
  agreement_date: string | null;
  commission_split: string | null;
  created_at: string;
}

export async function findOrganisationById(id: string): Promise<Organisation | null> {
  const db = await getDatabase();
  return db.collection<Organisation>('organisations').findOne({ _id: id });
}

export async function findAllOrganisations(filters?: {
  is_active?: boolean;
}): Promise<Organisation[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {};
  if (filters?.is_active !== undefined) query.is_active = filters.is_active;

  return db.collection<Organisation>('organisations')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function findOrganisationByABN(abn: string): Promise<Organisation | null> {
  const db = await getDatabase();
  return db.collection<Organisation>('organisations').findOne({ abn });
}

// Create organisation with full data object (including _id)
export async function createOrganisation(data: Partial<Organisation> & { company_name: string; is_active: boolean; created_at: string }): Promise<Organisation> {
  const db = await getDatabase();
  const id = data._id || new ObjectId().toString();
  const org: Organisation = {
    _id: id,
    company_name: data.company_name,
    trading_name: data.trading_name || null,
    abn: data.abn || null,
    address: data.address || null,
    suburb: data.suburb || null,
    state: data.state || null,
    postcode: data.postcode || null,
    phone: data.phone || null,
    email: data.email || null,
    entity_type: data.entity_type || null,
    industry_type: data.industry_type || null,
    industry: data.industry || null,
    is_active: data.is_active,
    agreement_ip: data.agreement_ip || null,
    agreement_date: data.agreement_date || null,
    commission_split: data.commission_split || null,
    created_at: data.created_at
  };
  await db.collection<Organisation>('organisations').insertOne(org);
  return org;
}

export async function updateOrganisation(id: string, data: Partial<Organisation>): Promise<Organisation | null> {
  const db = await getDatabase();
  return db.collection<Organisation>('organisations').findOneAndUpdate(
    { _id: id },
    { $set: data },
    { returnDocument: 'after' }
  );
}

export async function countOrganisations(filters?: { is_active?: boolean }): Promise<number> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {};
  if (filters?.is_active !== undefined) query.is_active = filters.is_active;
  return db.collection('organisations').countDocuments(query);
}

// Organisation Directors
export interface OrganisationDirector {
  _id: string;
  organisation_id: string;
  first_name: string;
  surname?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  created_at: string;
}

export async function findDirectorsByOrganisation(organisationId: string): Promise<OrganisationDirector[]> {
  const db = await getDatabase();
  return db.collection<OrganisationDirector>('organisation_directors')
    .find({ organisation_id: organisationId })
    .toArray();
}

export async function createDirector(data: Omit<OrganisationDirector, '_id'>): Promise<OrganisationDirector> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const director: OrganisationDirector = { _id: id, ...data };
  await db.collection<OrganisationDirector>('organisation_directors').insertOne(director);
  return director;
}

// Create organisation director with full data object (including _id)
export async function createOrganisationDirector(data: Partial<OrganisationDirector> & { organisation_id: string; first_name: string; created_at: string }): Promise<OrganisationDirector> {
  const db = await getDatabase();
  const id = data._id || new ObjectId().toString();
  const director: OrganisationDirector = {
    _id: id,
    organisation_id: data.organisation_id,
    first_name: data.first_name,
    surname: data.surname,
    last_name: data.last_name,
    email: data.email || null,
    phone: data.phone || null,
    is_primary: data.is_primary || false,
    created_at: data.created_at
  };
  await db.collection<OrganisationDirector>('organisation_directors').insertOne(director);
  return director;
}

export async function deleteDirectorsByOrganisation(organisationId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('organisation_directors').deleteMany({ organisation_id: organisationId });
}

// Organisation Details (commission split, etc.)
export interface OrganisationDetails {
  _id: string;
  organisation_id: string;
  commission_split: string | null;
  created_at: string;
}

export async function findOrganisationDetails(organisationId: string): Promise<OrganisationDetails | null> {
  const db = await getDatabase();
  return db.collection<OrganisationDetails>('organisation_details').findOne({ organisation_id: organisationId });
}

export async function upsertOrganisationDetails(organisationId: string, data: Partial<OrganisationDetails>): Promise<void> {
  const db = await getDatabase();
  await db.collection('organisation_details').updateOne(
    { organisation_id: organisationId },
    { $set: { ...data, organisation_id: organisationId } },
    { upsert: true }
  );
}
