import { MongoClient, Db } from 'mongodb';

interface MongoClientCache {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

// Global cache for connection
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: MongoClientCache | undefined;
}

const cached: MongoClientCache = global._mongoClientPromise || {
  client: null,
  db: null,
  promise: null,
};

if (!global._mongoClientPromise) {
  global._mongoClientPromise = cached;
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  // Check environment variables at runtime, not build time
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB = process.env.MONGODB_DB || 'loanease';

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = MongoClient.connect(MONGODB_URI, opts)
      .then((client) => {
        const db = client.db(MONGODB_DB);
        cached.client = client;
        cached.db = db;
        return { client, db };
      })
      .catch((error) => {
        cached.promise = null; // Reset so we can retry
        throw error;
      });
  }

  return cached.promise;
}

// Helper to get just the database
export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// Collection names matching Supabase tables
export const COLLECTIONS = {
  USERS: 'users',
  ORGANISATIONS: 'organisations',
  ORGANISATION_DIRECTORS: 'organisation_directors',
  ORGANISATION_DETAILS: 'organisation_details',
  CLIENTS: 'clients',
  OPPORTUNITIES: 'opportunities',
  OPPORTUNITY_DETAILS: 'opportunity_details',
  COMMENTS: 'comments',
  AUDIT_LOGS: 'audit_logs',
  GLOBAL_SETTINGS: 'global_settings',
  EMAIL_VERIFICATION_TOKENS: 'email_verification_tokens',
  PRE_ASSESSMENT_CONTACTS: 'pre_assessment_contacts',
  LOGIN_HISTORY: 'login_history',
  AUTH_USERS: 'auth_users',
  USER_INVITATIONS: 'user_invitations',
  MOBILE_OTP_CODES: 'mobile_otp_codes',
  MOBILE_DEVICES: 'mobile_devices',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
