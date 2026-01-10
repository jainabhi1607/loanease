import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // First check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch the specific user
    const referrerUser = await db.collection('users').findOne({
      _id: id as any,
      role: 'referrer_admin'
    });

    if (!referrerUser) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Fetch the organisation
    const organisation = await db.collection('organisations').findOne({
      _id: referrerUser.organisation_id
    });

    if (!organisation) {
      console.error('Error fetching organisation: organisation not found');
    }

    // Fetch additional directors
    const directors = await db.collection('organisation_directors')
      .find({
        organisation_id: referrerUser.organisation_id,
        is_primary: false
      })
      .sort({ created_at: 1 })
      .toArray();

    // Transform the data
    const firstName = referrerUser.first_name || '';
    const lastName = referrerUser.surname || referrerUser.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    // Extract state from address if available
    let state = '';
    if (organisation?.address) {
      const statePatterns = [
        { pattern: /\b(NSW|New South Wales)\b/i, abbr: 'NSW' },
        { pattern: /\b(VIC|Victoria)\b/i, abbr: 'VIC' },
        { pattern: /\b(QLD|Queensland)\b/i, abbr: 'QLD' },
        { pattern: /\b(WA|Western Australia)\b/i, abbr: 'WA' },
        { pattern: /\b(SA|South Australia)\b/i, abbr: 'SA' },
        { pattern: /\b(TAS|Tasmania)\b/i, abbr: 'TAS' },
        { pattern: /\b(ACT|Australian Capital Territory)\b/i, abbr: 'ACT' },
        { pattern: /\b(NT|Northern Territory)\b/i, abbr: 'NT' }
      ];

      for (const { pattern, abbr } of statePatterns) {
        if (pattern.test(organisation.address)) {
          state = abbr;
          break;
        }
      }
    }

    const referrer = {
      id: referrerUser._id,
      organisation_id: referrerUser.organisation_id,
      company_name: organisation?.company_name || '',
      contact_name: fullName || '',
      email: referrerUser.email,
      phone: referrerUser.phone || referrerUser.mobile || '',
      state: state,
      status: 'active',
      created_at: referrerUser.created_at,
      // Include full user details
      user: {
        id: referrerUser._id,
        first_name: referrerUser.first_name,
        surname: referrerUser.surname,
        email: referrerUser.email,
        phone: referrerUser.phone,
        mobile: referrerUser.mobile,
        role: referrerUser.role,
        two_fa_enabled: referrerUser.two_fa_enabled,
        created_at: referrerUser.created_at
      },
      // Include additional organisation details
      organisation: organisation,
      // Include additional directors
      directors: directors || []
    };

    return NextResponse.json({ referrer });

  } catch (error) {
    console.error('Error in referrer API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
