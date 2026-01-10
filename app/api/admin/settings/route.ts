import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';

// GET - Fetch all settings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'admin_team'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch all settings
    const settings = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).find({}).toArray();

    // Convert to key-value object
    const settingsObj: Record<string, any> = {};
    settings?.forEach((setting: any) => {
      // Try to parse as JSON first, if it fails, use as string
      try {
        const parsed = JSON.parse(setting.value);
        settingsObj[setting.key] = parsed;
      } catch {
        settingsObj[setting.key] = setting.value;
      }
    });

    return NextResponse.json({ settings: settingsObj });

  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'admin_team'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { setting_key, setting_value, description } = body;

    if (!setting_key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    // Convert value to string for storage
    let valueToStore = setting_value;

    if (Array.isArray(setting_value) || typeof setting_value === 'object') {
      valueToStore = JSON.stringify(setting_value);
    } else if (typeof setting_value === 'number') {
      valueToStore = setting_value.toString();
    }

    console.log('Settings API - Attempting to save:', {
      key: setting_key,
      value: valueToStore,
      valueType: typeof valueToStore,
      valueLength: valueToStore?.length,
    });

    const db = await getDatabase();

    // Upsert setting using key
    const result = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).updateOne(
      { key: setting_key },
      {
        $set: {
          key: setting_key,
          value: valueToStore,
          description: description || null,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    console.log('Settings API - Upsert result:', {
      success: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });

    // Log to audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: new ObjectId().toString() as any,
      user_id: user.userId,
      table_name: 'global_settings',
      action: 'update',
      field_name: setting_key,
      new_value: valueToStore,
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Setting saved successfully',
    });

  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
