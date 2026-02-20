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
        // Look for Indian state names and abbreviations
        const statePatterns = [
          { pattern: /\b(MH|Maharashtra)\b/i, abbr: 'MH' },
          { pattern: /\b(DL|Delhi)\b/i, abbr: 'DL' },
          { pattern: /\b(KA|Karnataka)\b/i, abbr: 'KA' },
          { pattern: /\b(TN|Tamil Nadu)\b/i, abbr: 'TN' },
          { pattern: /\b(UP|Uttar Pradesh)\b/i, abbr: 'UP' },
          { pattern: /\b(GJ|Gujarat)\b/i, abbr: 'GJ' },
          { pattern: /\b(RJ|Rajasthan)\b/i, abbr: 'RJ' },
          { pattern: /\b(WB|West Bengal)\b/i, abbr: 'WB' },
          { pattern: /\b(KL|Kerala)\b/i, abbr: 'KL' },
          { pattern: /\b(TS|Telangana)\b/i, abbr: 'TS' },
          { pattern: /\b(AP|Andhra Pradesh)\b/i, abbr: 'AP' },
          { pattern: /\b(MP|Madhya Pradesh)\b/i, abbr: 'MP' },
          { pattern: /\b(PB|Punjab)\b/i, abbr: 'PB' },
          { pattern: /\b(HR|Haryana)\b/i, abbr: 'HR' },
          { pattern: /\b(BR|Bihar)\b/i, abbr: 'BR' },
          { pattern: /\b(GA|Goa)\b/i, abbr: 'GA' },
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
        phone: user.phone || user.mobile || '',
        state: state,
        status: org?.is_active === false ? 'inactive' : 'active',
        created_at: user.created_at
      };
    });

    return NextResponse.json({ referrers });

  } catch (error) {
    console.error('Error in referrers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
