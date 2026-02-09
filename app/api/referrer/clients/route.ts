import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user's organization
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer (referrer_admin or referrer_team)
    if (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!userData.organisation_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Fetch all clients for this organization
    const clients = await db.collection(COLLECTIONS.CLIENTS)
      .find({ organisation_id: userData.organisation_id })
      .sort({ created_at: -1 })
      .toArray();

    // Get opportunity counts per client
    const clientIds = clients.map((c: any) => c._id);
    const opportunityCounts = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({ client_id: { $in: clientIds as any }, status: { $ne: 'withdrawn' }, deleted_at: null })
      .project({ client_id: 1 })
      .toArray();

    const countsMap = new Map<string, number>();
    opportunityCounts.forEach((opp: any) => {
      countsMap.set(opp.client_id, (countsMap.get(opp.client_id) || 0) + 1);
    });

    // Map _id to id for consistency
    const formattedClients = clients.map((c: any) => ({
      ...c,
      id: c._id,
      opportunities_count: countsMap.get(c._id) || 0,
    }));

    return NextResponse.json({ clients: formattedClients });

  } catch (error) {
    console.error('Error in referrer clients API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
