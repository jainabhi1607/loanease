import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
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

    // Fetch all organisations
    const organisations = await db.collection('organisations')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    // Fetch all referrer admin users (only those with an organisation_id)
    const users = await db.collection('users')
      .find({
        role: 'referrer_admin',
        organisation_id: { $ne: null }
      })
      .sort({ created_at: -1 })
      .toArray();

    // Transform and combine the data
    const referrers = users.map((user: any) => {
      const org: any = organisations.find((o: any) => o._id === user.organisation_id);

      // Use correct field names based on database schema
      const firstName = user.first_name || '';
      const lastName = user.surname || user.last_name || ''; // Try surname first, then last_name
      const fullName = `${firstName} ${lastName}`.trim();

      // Try to extract state from address if available
      let state = '';
      if (org?.address) {
        // Look for both full state names and abbreviations
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
          if (pattern.test(org.address)) {
            state = abbr;
            break;
          }
        }
      }

      return {
        id: user._id,
        organisation_id: user.organisation_id,
        company_name: org?.company_name || '',
        contact_name: fullName || '',
        email: user.email,
        phone: user.phone || user.mobile || '', // Try phone first, then mobile
        state: state,
        status: 'active',
        created_at: user.created_at
      };
    });

    return NextResponse.json({ referrers });

  } catch (error) {
    console.error('Error in referrers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
