import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

// GET - Fetch commission split for current referrer's organization
// Returns custom commission split if set, otherwise returns default from settings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user's organization
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData || !userData.organisation_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check if user is a referrer
    if (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get custom commission split from organisation_details
    const orgDetails = await db.collection(COLLECTIONS.ORGANISATION_DETAILS).findOne({
      organisation_id: userData.organisation_id
    });

    const customCommissionSplit = orgDetails?.commission_split;

    // If custom commission split exists, return it
    if (customCommissionSplit) {
      return NextResponse.json({
        commission_split: customCommissionSplit,
        is_custom: true,
      });
    }

    // Otherwise, get default from global settings
    const setting = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).findOne({
      key: 'commission_split'
    });

    const defaultCommissionSplit = setting?.value || '';

    return NextResponse.json({
      commission_split: defaultCommissionSplit,
      is_custom: false,
    });

  } catch (error) {
    console.error('Error fetching commission split:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
