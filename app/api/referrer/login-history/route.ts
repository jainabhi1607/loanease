import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

// GET - Fetch login history for current referrer user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden - Referrer access required' }, { status: 403 });
    }

    const db = await getDatabase();

    // Get full user details from DB
    const userData = await db.collection('users').findOne({ _id: user.userId as any });
    const userName = userData ? `${userData.first_name || ''} ${userData.surname || ''}`.trim() : '';

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - Filter by current user ID OR email (for failed attempts where user_id is null)
    const matchConditions: Record<string, unknown> = {
      $or: [
        { user_id: user.userId },
        { user_id: null, email: user.email }
      ]
    };

    // Apply status filter
    if (status && status !== 'all') {
      matchConditions.status = status;
    }

    // Get total count
    const total = await db.collection('login_history').countDocuments(matchConditions);

    // Fetch login history
    const loginHistory = await db.collection('login_history')
      .find(matchConditions)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Enrich with user details
    const enrichedHistory = loginHistory.map(log => ({
      id: log._id,
      user_id: log.user_id,
      email: log.email,
      status: log.status,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      failure_reason: log.failure_reason,
      created_at: log.created_at,
      user_name: userName,
      user_role: user.role,
    }));

    return NextResponse.json({
      loginHistory: enrichedHistory,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error in login history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
