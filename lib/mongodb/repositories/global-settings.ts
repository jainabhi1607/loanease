import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface GlobalSetting {
  _id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function findSettingByKey(settingKey: string): Promise<GlobalSetting | null> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings').findOne({ key: settingKey });
}

export async function findAllSettings(): Promise<GlobalSetting[]> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings').find({}).toArray();
}

export async function findSettingsByKeys(keys: string[]): Promise<GlobalSetting[]> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings')
    .find({ key: { $in: keys } })
    .toArray();
}

export async function getSettingValue(settingKey: string): Promise<string | null> {
  const setting = await findSettingByKey(settingKey);
  return setting?.value || null;
}

export async function getSettingsMap(keys: string[]): Promise<Record<string, string>> {
  const settings = await findSettingsByKeys(keys);
  const map: Record<string, string> = {};
  for (const setting of settings) {
    map[setting.key] = setting.value;
  }
  return map;
}

export async function upsertSetting(settingKey: string, value: string): Promise<GlobalSetting> {
  const db = await getDatabase();
  const result = await db.collection<GlobalSetting>('global_settings').findOneAndUpdate(
    { key: settingKey },
    {
      $set: {
        value: value,
        updated_at: new Date().toISOString()
      },
      $setOnInsert: {
        _id: new ObjectId().toString(),
        key: settingKey,
        description: null,
        created_at: new Date().toISOString()
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
  return result!;
}

export async function updateSetting(settingKey: string, value: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('global_settings').updateOne(
    { key: settingKey },
    { $set: { value: value, updated_at: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

// Common settings helpers
export async function getTermsAndConditions(): Promise<string | null> {
  return getSettingValue('terms_and_conditions');
}

export async function getDefaultInterestRate(): Promise<number> {
  const value = await getSettingValue('default_interest_rate');
  return value ? parseFloat(value) : 8.5; // Default to 8.5%
}

export async function getReferrerFees(): Promise<string | null> {
  return getSettingValue('referrer_fees');
}

export async function getDefaultCommissionSplit(): Promise<string | null> {
  return getSettingValue('commission_split');
}

// Email template settings
export async function getEmailTemplate(templateKey: string): Promise<{ subject: string; content: string } | null> {
  const settings = await findSettingsByKeys([`${templateKey}_subject`, `${templateKey}_content`]);
  const subject = settings.find(s => s.key === `${templateKey}_subject`)?.value;
  const content = settings.find(s => s.key === `${templateKey}_content`)?.value;

  if (!subject && !content) return null;
  return { subject: subject || '', content: content || '' };
}

export async function getNewBrokerAlertRecipients(): Promise<string[]> {
  const value = await getSettingValue('new_referrer_alert_emails');
  if (!value) return [];
  return value.split('\n').map(email => email.trim()).filter(Boolean);
}

// Security settings helpers
export async function getMaxLoginAttempts(): Promise<number> {
  const value = await getSettingValue('max_login_attempts');
  return value ? parseInt(value, 10) : 10;
}

export async function getLockoutDurationMinutes(): Promise<number> {
  const value = await getSettingValue('lockout_duration_minutes');
  return value ? parseInt(value, 10) : 60;
}

export async function getTwoFACodeExpiryMinutes(): Promise<number> {
  const value = await getSettingValue('two_fa_code_expiry_minutes');
  return value ? parseInt(value, 10) : 10;
}

export async function getLoanDeclinedReasons(): Promise<string[]> {
  const value = await getSettingValue('loan_declined_reasons');
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((r: string) => r.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Token/invitation expiry settings
export async function getPasswordResetExpiryHours(): Promise<number> {
  const value = await getSettingValue('password_reset_expiry_hours');
  return value ? parseInt(value, 10) : 1;
}

export async function getEmailVerificationExpiryHours(): Promise<number> {
  const value = await getSettingValue('email_verification_expiry_hours');
  return value ? parseInt(value, 10) : 24;
}

export async function getInvitationExpiryDays(): Promise<number> {
  const value = await getSettingValue('invitation_expiry_days');
  return value ? parseInt(value, 10) : 7;
}

export async function getMaxInvitationResends(): Promise<number> {
  const value = await getSettingValue('max_invitation_resends');
  return value ? parseInt(value, 10) : 5;
}

// Blocked email domains (disposable/temporary email providers)
const DEFAULT_BLOCKED_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'yopmail.com',
  'temp-mail.org',
  'maildrop.cc',
  'mintemail.com',
];

export async function getBlockedEmailDomains(): Promise<string[]> {
  const value = await getSettingValue('blocked_email_domains');
  if (!value) return DEFAULT_BLOCKED_DOMAINS;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((d: string) => d.trim().toLowerCase()).filter(Boolean) : DEFAULT_BLOCKED_DOMAINS;
  } catch {
    return DEFAULT_BLOCKED_DOMAINS;
  }
}

// Company details settings
export async function getCompanyPhone(): Promise<string> {
  const value = await getSettingValue('company_phone');
  return value || '+91 22 6200 0000';
}

export async function getCompanyAddress(): Promise<string> {
  const value = await getSettingValue('company_address');
  return value || 'Mumbai, Maharashtra, India';
}

export async function getCompanyEmail(): Promise<string> {
  const value = await getSettingValue('company_email');
  return value || 'partners@loanease.com';
}
