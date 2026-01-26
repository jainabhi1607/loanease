import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get organization_id from query params
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId || organizationId === 'null') {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Fetch all clients for the organization
    const clientsRaw = await db.collection('clients')
      .find({
        organisation_id: organizationId,
        deleted_at: null
      })
      .sort({ created_at: -1 })
      .toArray();

    // Map _id to id for frontend compatibility
    const clients = clientsRaw.map((client: any) => ({
      ...client,
      id: client._id,
    }));

    return NextResponse.json({ clients: clients || [] });

  } catch (error) {
    console.error('Error in clients API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
