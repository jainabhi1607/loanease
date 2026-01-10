import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organisationId } = await params;

  // Validate organisation ID
  if (!organisationId || organisationId === 'null') {
    return NextResponse.json({ error: 'Valid organisation ID is required' }, { status: 400 });
  }

  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const isAdmin = user.role === 'super_admin' || user.role === 'admin_team';
    const isReferrerAdmin = user.role === 'referrer_admin' && user.organisationId === organisationId;

    if (!isAdmin && !isReferrerAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch all users in the organisation
    const users = await db.collection('users')
      .find({ organisation_id: organisationId })
      .sort({ created_at: -1 })
      .project({
        _id: 1,
        email: 1,
        first_name: 1,
        surname: 1,
        role: 1,
        created_at: 1
      })
      .toArray();

    // Transform _id to id for consistency
    const formattedUsers = users.map((u: any) => ({
      id: u._id,
      email: u.email,
      first_name: u.first_name,
      surname: u.surname,
      role: u.role,
      created_at: u.created_at
    }));

    return NextResponse.json({ users: formattedUsers });

  } catch (error) {
    console.error('Error in organisation users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
