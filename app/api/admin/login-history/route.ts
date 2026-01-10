import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

// GET - Fetch login history
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDatabase();

    // Build query
    const query: any = {};

    // Apply filters
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { ip_address: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Get total count
    const count = await db.collection(COLLECTIONS.LOGIN_HISTORY).countDocuments(query);

    // Get login history with pagination
    const loginHistory = await db.collection(COLLECTIONS.LOGIN_HISTORY)
      .find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Define type for login history entry
    type LoginHistoryEntry = {
      _id: string;
      user_id: string | null;
      email: string;
      status: string;
      ip_address: string | null;
      user_agent: string | null;
      failure_reason: string | null;
      created_at: Date | string;
    };

    const loginHistoryData = loginHistory as unknown as LoginHistoryEntry[];

    // Fetch user details for each login
    const userIds = [...new Set(loginHistoryData?.map(log => log.user_id).filter(Boolean))] as string[];

    // Define type for user data
    type UserInfo = {
      _id: string;
      first_name: string;
      surname: string;
      role: string;
    };

    let usersMap = new Map<string, UserInfo>();
    if (userIds.length > 0) {
      const users = await db.collection(COLLECTIONS.USERS)
        .find({ _id: { $in: userIds as any } })
        .toArray();

      const usersData = users as unknown as UserInfo[];
      usersMap = new Map(usersData?.map(u => [u._id, u]) || []);
    }

    // Enrich login history with user details
    const enrichedHistory = loginHistoryData?.map(log => {
      const userData = usersMap.get(log.user_id || '');
      return {
        id: log._id,
        user_id: log.user_id,
        email: log.email,
        status: log.status,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        failure_reason: log.failure_reason,
        created_at: log.created_at,
        user_name: userData ? `${userData.first_name} ${userData.surname}` : 'Unknown User',
        user_role: userData?.role || 'N/A',
      };
    });

    return NextResponse.json({
      loginHistory: enrichedHistory,
      total: count,
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
