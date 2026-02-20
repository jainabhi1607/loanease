import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getTwoFACodeExpiryMinutes } from './global-settings';

// Two Factor Authentication Codes
export interface TwoFACode {
  _id: string;
  user_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export async function createTwoFACode(userId: string): Promise<TwoFACode> {
  const db = await getDatabase();

  // Delete any existing unused codes for this user
  await db.collection('two_fa_codes').deleteMany({
    user_id: userId,
    used: false
  });

  // Generate a 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Expires based on DB setting (default 10 minutes)
  const expiryMinutes = await getTwoFACodeExpiryMinutes();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  const twoFACode: TwoFACode = {
    _id: new ObjectId().toString(),
    user_id: userId,
    code,
    expires_at: expiresAt,
    used: false,
    created_at: new Date().toISOString()
  };

  await db.collection<TwoFACode>('two_fa_codes').insertOne(twoFACode);
  return twoFACode;
}

export async function verifyTwoFACode(userId: string, code: string): Promise<boolean> {
  const db = await getDatabase();

  const twoFACode = await db.collection<TwoFACode>('two_fa_codes').findOne({
    user_id: userId,
    code,
    used: false,
    expires_at: { $gt: new Date().toISOString() }
  });

  if (!twoFACode) return false;

  // Mark as used
  await db.collection('two_fa_codes').updateOne(
    { _id: twoFACode._id as any },
    { $set: { used: true } }
  );

  return true;
}

// Verify 2FA code (returns the code data). If userId is provided, validates ownership.
export async function verify2FACode(code: string, userId?: string): Promise<TwoFACode | null> {
  const db = await getDatabase();

  const query: any = {
    code,
    used: false,
    expires_at: { $gt: new Date().toISOString() }
  };
  if (userId) {
    query.user_id = userId;
  }

  const twoFACode = await db.collection<TwoFACode>('two_fa_codes').findOne(query);

  return twoFACode;
}

// Delete used and expired codes for a user
export async function deleteUsed2FACodes(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('two_fa_codes').deleteMany({
    user_id: userId,
    $or: [
      { used: true },
      { expires_at: { $lt: new Date().toISOString() } }
    ]
  });
}

// Invalidate existing unused 2FA codes for a user
export async function invalidateExisting2FACodes(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('two_fa_codes').updateMany(
    { user_id: userId, used: false },
    { $set: { used: true } }
  );
}

export async function deleteTwoFACodes(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('two_fa_codes').deleteMany({ user_id: userId });
}

// Email Verification Tokens
export interface EmailVerificationToken {
  _id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  signup_data: Record<string, unknown> | null;
  created_at: string;
}

// Create email verification token with full data object
export async function createEmailVerificationToken(data: Omit<EmailVerificationToken, 'used_at'> & { used_at?: string | null }): Promise<EmailVerificationToken> {
  const db = await getDatabase();

  const verificationToken: EmailVerificationToken = {
    ...data,
    used_at: data.used_at || null
  };

  await db.collection<EmailVerificationToken>('email_verification_tokens').insertOne(verificationToken);
  return verificationToken;
}

export async function findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
  const db = await getDatabase();
  return db.collection<EmailVerificationToken>('email_verification_tokens').findOne({
    token,
    used_at: null,
    expires_at: { $gt: new Date().toISOString() }
  });
}

// Alias for findEmailVerificationToken
export async function verifyEmailToken(token: string): Promise<EmailVerificationToken | null> {
  const db = await getDatabase();
  return db.collection<EmailVerificationToken>('email_verification_tokens').findOne({ token });
}

// Find the latest unused verification token for a user
export async function findLatestEmailVerificationToken(userId: string): Promise<EmailVerificationToken | null> {
  const db = await getDatabase();
  return db.collection<EmailVerificationToken>('email_verification_tokens')
    .findOne(
      { user_id: userId, used_at: null },
      { sort: { created_at: -1 } }
    );
}

// Invalidate all unused verification tokens for a user
export async function invalidateEmailVerificationTokens(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('email_verification_tokens').updateMany(
    { user_id: userId, used_at: null },
    { $set: { used_at: new Date().toISOString() } }
  );
}

export async function markEmailVerificationTokenUsed(token: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('email_verification_tokens').updateOne(
    { token },
    { $set: { used_at: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

// Password Reset Tokens
export interface PasswordResetToken {
  _id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Create password reset token with full data object
export async function createPasswordResetToken(data: Omit<PasswordResetToken, 'used_at'> & { used_at?: string | null }): Promise<PasswordResetToken> {
  const db = await getDatabase();

  // Delete any existing unused tokens for this user
  await db.collection('password_reset_tokens').deleteMany({
    user_id: data.user_id,
    used_at: null
  });

  const resetToken: PasswordResetToken = {
    ...data,
    used_at: data.used_at || null
  };

  await db.collection<PasswordResetToken>('password_reset_tokens').insertOne(resetToken);
  return resetToken;
}

export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const db = await getDatabase();
  return db.collection<PasswordResetToken>('password_reset_tokens').findOne({
    token,
    used_at: null,
    expires_at: { $gt: new Date().toISOString() }
  });
}

// Alias for findPasswordResetToken (verify without expiry check for explicit handling)
export async function verifyPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const db = await getDatabase();
  return db.collection<PasswordResetToken>('password_reset_tokens').findOne({
    token,
    used_at: null
  });
}

export async function markPasswordResetTokenUsed(token: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('password_reset_tokens').updateOne(
    { token },
    { $set: { used_at: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

// User Sessions (for refresh token tracking)
export interface UserSession {
  _id: string;
  user_id: string;
  refresh_token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

export async function createUserSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<UserSession> {
  const db = await getDatabase();

  // Expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const session: UserSession = {
    _id: new ObjectId().toString(),
    user_id: userId,
    refresh_token: refreshToken,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  await db.collection<UserSession>('user_sessions').insertOne(session);
  return session;
}

export async function findUserSession(refreshToken: string): Promise<UserSession | null> {
  const db = await getDatabase();
  return db.collection<UserSession>('user_sessions').findOne({
    refresh_token: refreshToken,
    expires_at: { $gt: new Date().toISOString() }
  });
}

export async function deleteUserSession(refreshToken: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('user_sessions').deleteOne({ refresh_token: refreshToken });
  return result.deletedCount > 0;
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.collection('user_sessions').deleteMany({ user_id: userId });
}

// Pre-assessment Contacts
export interface PreAssessmentContact {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  message: string | null;
  created_at: string;
}

export async function createPreAssessmentContact(data: Omit<PreAssessmentContact, '_id'>): Promise<PreAssessmentContact> {
  const db = await getDatabase();
  const id = new ObjectId().toString();
  const contact: PreAssessmentContact = { _id: id, ...data };
  await db.collection<PreAssessmentContact>('pre_assessment_contacts').insertOne(contact);
  return contact;
}

export async function findAllPreAssessmentContacts(): Promise<PreAssessmentContact[]> {
  const db = await getDatabase();
  return db.collection<PreAssessmentContact>('pre_assessment_contacts')
    .find({})
    .sort({ created_at: -1 })
    .toArray();
}
