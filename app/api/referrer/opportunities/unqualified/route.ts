import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins (super_admin / admin_team) see all data, like the web app.
    // Referrers are scoped to their own organisation.
    const isAdmin = user.role === 'super_admin' || user.role === 'admin_team';
    const isReferrer = user.role === 'referrer_admin' || user.role === 'referrer_team';

    if (!isAdmin && !isReferrer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin && !user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Match stage (admins: all orgs; referrers: their org only)
    const orgMatch: any = { deleted_at: null };
    if (!isAdmin) {
      orgMatch.organization_id = user.organisationId;
    }

    // Aggregate opportunities with their details
    const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
      {
        $match: orgMatch
      },
      {
        $lookup: {
          from: COLLECTIONS.CLIENTS,
          localField: 'client_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: COLLECTIONS.OPPORTUNITY_DETAILS,
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'opportunity_details'
        }
      },
      { $unwind: { path: '$opportunity_details', preserveNullAndEmptyArrays: true } },
      // Filter for unqualified opportunities
      {
        $match: {
          'opportunity_details.is_unqualified': 1
        }
      },
      { $sort: { created_at: -1 } },
      {
        $project: {
          id: '$_id',
          opportunity_id: 1,
          loan_amount: 1,
          status: 1,
          created_at: 1,
          'client.entity_name': 1,
          'client.contact_first_name': 1,
          'client.contact_last_name': 1,
          'opportunity_details.is_unqualified': 1,
          'opportunity_details.unqualified_date': 1,
          'opportunity_details.unqualified_reason': 1
        }
      }
    ]).toArray();

    // Format the response
    const unqualifiedOpportunities = opportunities.map((opp: any) => ({
      id: opp._id,
      opportunity_id: opp.opportunity_id,
      client_entity_name: opp.client?.entity_name || '',
      client_contact_name: `${opp.client?.contact_first_name || ''} ${opp.client?.contact_last_name || ''}`.trim(),
      loan_amount: opp.loan_amount || 0,
      status: opp.status,
      unqualified_date: opp.opportunity_details?.unqualified_date || null,
      unqualified_reason: opp.opportunity_details?.unqualified_reason || '',
      created_at: opp.created_at,
    }));

    return NextResponse.json({
      success: true,
      opportunities: unqualifiedOpportunities,
      count: unqualifiedOpportunities.length
    });

  } catch (error) {
    console.error('Error in referrer unqualified opportunities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
