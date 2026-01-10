import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user details
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer (admin or team member)
    if (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden - Referrer access only' }, { status: 403 });
    }

    const isTeamMember = userData.role === 'referrer_team';
    const organisationId = userData.organisation_id;

    if (!organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Fetch organization details
    const organization = await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: organisationId as any });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch directors
    const directors = await db.collection(COLLECTIONS.ORGANISATION_DIRECTORS)
      .find({ organisation_id: organisationId })
      .sort({ created_at: 1 })
      .toArray();

    // Fetch only referrer users in the organization (referrer_admin and referrer_team)
    const users = await db.collection(COLLECTIONS.USERS)
      .find({
        organisation_id: organisationId,
        role: { $in: ['referrer_admin', 'referrer_team'] }
      })
      .sort({ created_at: -1 })
      .toArray();

    // Ensure is_active and state have defaults if not present
    const usersWithDefaults = users.map((u: any) => ({
      id: u._id,
      first_name: u.first_name,
      surname: u.surname,
      email: u.email,
      phone: u.phone,
      role: u.role,
      is_active: u.is_active !== undefined ? u.is_active : true,
      state: u.state || null
    }));

    console.log('Organisation ID:', organisationId);
    console.log('Users count:', usersWithDefaults?.length || 0);

    // Sort users so referrer_admin (main account owner) is always on top
    const sortedUsers = usersWithDefaults.sort((a: any, b: any) => {
      if (a.role === 'referrer_admin' && b.role !== 'referrer_admin') return -1;
      if (a.role !== 'referrer_admin' && b.role === 'referrer_admin') return 1;
      return 0;
    });

    console.log('Sorted Users count:', sortedUsers.length);

    // Format response - Team members only get their profile info
    if (isTeamMember) {
      return NextResponse.json({
        organization: {
          id: organization._id,
          entity_name: organization.company_name,
          is_active: organization.is_active,
        },
        current_user: {
          id: userData._id,
          first_name: userData.first_name,
          surname: userData.surname,
          email: userData.email,
          phone: userData.phone,
          state: userData.state,
          role: userData.role,
        },
        directors: [],
        users: [],
        isTeamMember: true,
      });
    }

    // Full response for admins
    return NextResponse.json({
      organization: {
        id: organization._id,
        entity_name: organization.company_name,
        key_contact_name: `${userData.first_name} ${userData.surname}`,
        mobile: userData.phone,
        email: userData.email,
        abn: organization.abn,
        trading_name: organization.trading_name,
        address: organization.address,
        industry_type: organization.industry_type,
        entity_type: organization.entity_type,
        is_active: organization.is_active,
      },
      current_user: {
        id: userData._id,
        first_name: userData.first_name,
        surname: userData.surname,
        email: userData.email,
        phone: userData.phone,
        state: userData.state,
        role: userData.role,
      },
      directors: directors.map((d: any) => ({
        ...d,
        id: d._id,
      })),
      users: sortedUsers,
      isTeamMember: false,
    });

  } catch (error) {
    console.error('Error in referrer account API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
