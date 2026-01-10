import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface Opportunity {
  _id: string;
  opportunity_id: string; // CF10020 format
  organization_id: string;
  client_id: string;
  created_by: string;
  status: string;
  external_ref: string | null;
  entity_type: number | null;
  asset_type: string | null;
  loan_amount: number | null;
  loan_type: string | null;
  loan_purpose: string | null;
  icr: number | null;
  lvr: number | null;
  industry: string | null;
  time_in_business: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface OpportunityDetails {
  _id: string;
  opportunity_id: string; // FK to opportunities._id
  client_address: string | null;
  estimated_property_value: number | null;
  net_profit: number | null;
  amortisation: number | null;
  depreciation: number | null;
  existing_interest: number | null;
  rental_expense: number | null;
  proposed_rental_income: number | null;
  is_unqualified: number | null; // 1 = unqualified
  unqualified_reason: string | null;
  target_settlement_date: string | null;
  date_settled: string | null;
  brief_overview: string | null;
  terms: string | null;
  time_in_business: string | null;
  // Boolean fields (stored as 1/0 or "Yes"/"No")
  any_debt_to_ato: number | null;
  any_defaults: number | null;
  any_legal_action: number | null;
  in_any_legal_disputes: number | null;
  any_partner_guarantors: number | null;
  // Deal finalisation
  deal_finalisation_status: string | null;
  loan_acc_ref_no: string | null;
  flex_id: string | null;
  payment_received_date: string | null;
  payment_amount: number | null;
  created_at: string;
}

export type OpportunityStatus =
  | 'draft'
  | 'opportunity'
  | 'application_created'
  | 'application_submitted'
  | 'conditionally_approved'
  | 'approved'
  | 'declined'
  | 'withdrawn'
  | 'settled';

export interface OpportunityFilters {
  organization_id?: string;
  status?: OpportunityStatus | OpportunityStatus[];
  is_unqualified?: boolean;
  client_id?: string;
  created_by?: string;
}

export async function findOpportunityById(id: string): Promise<Opportunity | null> {
  const db = await getDatabase();
  return db.collection<Opportunity>('opportunities').findOne({ _id: id as any, deleted_at: null });
}

export async function findOpportunityByOpportunityId(opportunityId: string): Promise<Opportunity | null> {
  const db = await getDatabase();
  return db.collection<Opportunity>('opportunities').findOne({ opportunity_id: opportunityId, deleted_at: null });
}

export async function findAllOpportunities(filters?: OpportunityFilters): Promise<Opportunity[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };

  if (filters?.organization_id) query.organization_id = filters.organization_id;
  if (filters?.client_id) query.client_id = filters.client_id;
  if (filters?.created_by) query.created_by = filters.created_by;
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }

  return db.collection<Opportunity>('opportunities')
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function findOpportunitiesWithDetails(filters?: OpportunityFilters & { is_unqualified?: boolean }): Promise<Array<Opportunity & { details?: OpportunityDetails }>> {
  const db = await getDatabase();

  const matchStage: Record<string, unknown> = { deleted_at: null };
  if (filters?.organization_id) matchStage.organization_id = filters.organization_id;
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      matchStage.status = { $in: filters.status };
    } else {
      matchStage.status = filters.status;
    }
  }

  const pipeline: object[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'opportunity_details',
        localField: '_id',
        foreignField: 'opportunity_id',
        as: 'details_array'
      }
    },
    {
      $addFields: {
        details: { $arrayElemAt: ['$details_array', 0] }
      }
    },
    { $unset: 'details_array' }
  ];

  // Filter by is_unqualified if specified
  if (filters?.is_unqualified !== undefined) {
    pipeline.push({
      $match: {
        'details.is_unqualified': filters.is_unqualified ? 1 : { $in: [0, null] }
      }
    });
  }

  pipeline.push({ $sort: { created_at: -1 } });

  return db.collection('opportunities').aggregate(pipeline).toArray() as Promise<Array<Opportunity & { details?: OpportunityDetails }>>;
}

export async function findOpportunityWithRelations(id: string): Promise<{
  opportunity: Opportunity;
  details: OpportunityDetails | null;
  client: unknown;
  organisation: unknown;
  creator: unknown;
} | null> {
  const db = await getDatabase();

  const result = await db.collection('opportunities').aggregate([
    { $match: { _id: id as any, deleted_at: null } },
    {
      $lookup: {
        from: 'opportunity_details',
        localField: '_id',
        foreignField: 'opportunity_id',
        as: 'details_array'
      }
    },
    {
      $lookup: {
        from: 'clients',
        localField: 'client_id',
        foreignField: '_id',
        as: 'client_array'
      }
    },
    {
      $lookup: {
        from: 'organisations',
        localField: 'organization_id',
        foreignField: '_id',
        as: 'organisation_array'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator_array'
      }
    },
    {
      $addFields: {
        details: { $arrayElemAt: ['$details_array', 0] },
        client: { $arrayElemAt: ['$client_array', 0] },
        organisation: { $arrayElemAt: ['$organisation_array', 0] },
        creator: { $arrayElemAt: ['$creator_array', 0] }
      }
    },
    { $unset: ['details_array', 'client_array', 'organisation_array', 'creator_array'] }
  ]).toArray();

  if (result.length === 0) return null;

  const doc = result[0];
  return {
    opportunity: doc as Opportunity,
    details: doc.details || null,
    client: doc.client,
    organisation: doc.organisation,
    creator: doc.creator
  };
}

export async function createOpportunity(data: Omit<Opportunity, '_id'>): Promise<Opportunity> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const opportunity: Opportunity = { _id: id, ...data };
  await db.collection<Opportunity>('opportunities').insertOne(opportunity);
  return opportunity;
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity | null> {
  const db = await getDatabase();
  return db.collection<Opportunity>('opportunities').findOneAndUpdate(
    { _id: id as any },
    { $set: data },
    { returnDocument: 'after' }
  );
}

export async function softDeleteOpportunity(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('opportunities').updateOne(
    { _id: id as any },
    { $set: { deleted_at: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

// Opportunity Details
export async function findOpportunityDetails(opportunityId: string): Promise<OpportunityDetails | null> {
  const db = await getDatabase();
  return db.collection<OpportunityDetails>('opportunity_details').findOne({ opportunity_id: opportunityId });
}

export async function createOpportunityDetails(data: Omit<OpportunityDetails, '_id'>): Promise<OpportunityDetails> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const details: OpportunityDetails = { _id: id, ...data };
  await db.collection<OpportunityDetails>('opportunity_details').insertOne(details);
  return details;
}

export async function updateOpportunityDetails(opportunityId: string, data: Partial<OpportunityDetails>): Promise<OpportunityDetails | null> {
  const db = await getDatabase();
  return db.collection<OpportunityDetails>('opportunity_details').findOneAndUpdate(
    { opportunity_id: opportunityId },
    { $set: data },
    { returnDocument: 'after', upsert: true }
  );
}

// Stats and counts
export async function countOpportunities(filters?: OpportunityFilters): Promise<number> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { deleted_at: null };
  if (filters?.organization_id) query.organization_id = filters.organization_id;
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }
  return db.collection('opportunities').countDocuments(query);
}

export async function sumSettledLoanAmounts(filters?: { organization_id?: string }): Promise<number> {
  const db = await getDatabase();
  const matchStage: Record<string, unknown> = {
    deleted_at: null
  };
  if (filters?.organization_id) matchStage.organization_id = filters.organization_id;

  // Join with opportunity_details to check date_settled
  const result = await db.collection('opportunities').aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'opportunity_details',
        localField: '_id',
        foreignField: 'opportunity_id',
        as: 'details'
      }
    },
    { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
    { $match: { 'details.date_settled': { $ne: null } } },
    {
      $group: {
        _id: null,
        total: { $sum: '$loan_amount' },
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  return result[0]?.total || 0;
}

export async function generateOpportunityId(): Promise<string> {
  const db = await getDatabase();

  // Find the highest existing opportunity_id
  const latest = await db.collection('opportunities')
    .find({ opportunity_id: { $regex: /^CF\d+$/ } })
    .sort({ opportunity_id: -1 })
    .limit(1)
    .toArray();

  if (latest.length === 0) {
    return 'CF10001';
  }

  const lastId = latest[0].opportunity_id;
  const numPart = parseInt(lastId.replace('CF', ''), 10);
  return `CF${numPart + 1}`;
}
