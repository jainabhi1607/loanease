import { getDatabase } from '../client';
import { ObjectId } from 'mongodb';

export interface GlobalSetting {
  _id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  created_at: string;
}

export async function findSettingByKey(key: string): Promise<GlobalSetting | null> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings').findOne({ setting_key: key });
}

export async function findAllSettings(): Promise<GlobalSetting[]> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings').find({}).toArray();
}

export async function findSettingsByKeys(keys: string[]): Promise<GlobalSetting[]> {
  const db = await getDatabase();
  return db.collection<GlobalSetting>('global_settings')
    .find({ setting_key: { $in: keys } })
    .toArray();
}

export async function getSettingValue(key: string): Promise<string | null> {
  const setting = await findSettingByKey(key);
  return setting?.setting_value || null;
}

export async function getSettingsMap(keys: string[]): Promise<Record<string, string>> {
  const settings = await findSettingsByKeys(keys);
  const map: Record<string, string> = {};
  for (const setting of settings) {
    map[setting.setting_key] = setting.setting_value;
  }
  return map;
}

export async function upsertSetting(key: string, value: string, type: string = 'text'): Promise<GlobalSetting> {
  const db = await getDatabase();
  const result = await db.collection<GlobalSetting>('global_settings').findOneAndUpdate(
    { setting_key: key },
    {
      $set: {
        setting_value: value,
        setting_type: type
      },
      $setOnInsert: {
        _id: new ObjectId().toString(),
        setting_key: key,
        created_at: new Date().toISOString()
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
  return result!;
}

export async function updateSetting(key: string, value: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('global_settings').updateOne(
    { setting_key: key },
    { $set: { setting_value: value } }
  );
  return result.modifiedCount > 0;
}

// Common settings helpers
export async function getTermsAndConditions(): Promise<string | null> {
  return getSettingValue('terms_and_conditions');
}

export async function getDefaultInterestRate(): Promise<number> {
  const value = await getSettingValue('default_interest_rate');
  return value ? parseFloat(value) : 7.5; // Default to 7.5%
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
  const subject = settings.find(s => s.setting_key === `${templateKey}_subject`)?.setting_value;
  const content = settings.find(s => s.setting_key === `${templateKey}_content`)?.setting_value;

  if (!subject && !content) return null;
  return { subject: subject || '', content: content || '' };
}

export async function getNewBrokerAlertRecipients(): Promise<string[]> {
  const value = await getSettingValue('new_broker_alert');
  if (!value) return [];
  return value.split('\n').map(email => email.trim()).filter(Boolean);
}
