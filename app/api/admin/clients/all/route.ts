import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Fetch user role data
    const userRoleData = await db.collection('users').findOne({ _id: user.userId as any });

    if (!userRoleData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query based on role
    const query: any = { deleted_at: null };

    // Apply organization filter for referrers
    if (userRoleData.role === 'referrer_admin' || userRoleData.role === 'referrer_team') {
      if (userRoleData.organisation_id) {
        // Filter by organisation_id instead of created_by to show all clients in the organization
        query.organisation_id = userRoleData.organisation_id;
        console.log('Filtering clients for organisation_id:', userRoleData.organisation_id);
      } else {
        // No organization found, return empty
        console.log('No organisation_id found for referrer');
        return NextResponse.json({ clients: [] }, { status: 200 });
      }
    }

    // Fetch clients
    const clients = await db.collection('clients')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    // Get opportunity counts for each client (excluding withdrawn)
    const opportunityCounts = await db.collection('opportunities')
      .find({ status: { $ne: 'withdrawn' } })
      .project({ client_id: 1 })
      .toArray();

    // Create a map of client_id -> count
    const countsMap = new Map<string, number>();
    opportunityCounts?.forEach((opp: any) => {
      const count = countsMap.get(opp.client_id) || 0;
      countsMap.set(opp.client_id, count + 1);
    });

    // Get all unique organisation_ids and created_by user ids
    const orgIds = [...new Set(clients?.map((c: any) => c.organisation_id).filter(Boolean))];
    const createdByIds = [...new Set(clients?.map((c: any) => c.created_by).filter(Boolean))];

    // Fetch organisations
    const organisations = orgIds.length > 0
      ? await db.collection('organisations')
          .find({ _id: { $in: orgIds } })
          .project({ _id: 1, company_name: 1 })
          .toArray()
      : [];

    // Fetch users (referrers who created the clients)
    const referrerUsers = createdByIds.length > 0
      ? await db.collection('users')
          .find({ _id: { $in: createdByIds } })
          .project({ _id: 1, first_name: 1, surname: 1 })
          .toArray()
      : [];

    // Create lookup maps
    const orgMap = new Map(organisations?.map((o: any) => [o._id, o]) || []);
    const userMap = new Map(referrerUsers?.map((u: any) => [u._id, u]) || []);

    // Combine data
    const enrichedClients = clients?.map((client: any) => {
      const org = orgMap.get(client.organisation_id);
      const referrer = userMap.get(client.created_by);

      return {
        id: client._id,
        entity_name: client.entity_name || '',
        first_name: client.contact_first_name || '',
        last_name: client.contact_last_name || '',
        email: client.contact_email || '',
        mobile: client.contact_phone || '',
        state: client.state || '',
        referrer_group: org?.company_name || '',
        referrer_name: referrer ? `${referrer.first_name} ${referrer.surname}`.trim() : '',
        opportunities_count: countsMap.get(client._id) || 0,
        created_at: client.created_at,
      };
    }) || [];

    return NextResponse.json({ clients: enrichedClients }, { status: 200 });
  } catch (error) {
    console.error('Error in clients API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
