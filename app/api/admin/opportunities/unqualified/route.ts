import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch unqualified opportunities using aggregation pipeline
    const pipeline = [
      { $match: { deleted_at: null } },
      // Join with clients
      {
        $lookup: {
          from: COLLECTIONS.CLIENTS,
          localField: 'client_id',
          foreignField: '_id',
          as: 'clients'
        }
      },
      { $unwind: { path: '$clients', preserveNullAndEmptyArrays: true } },
      // Join with organisations
      {
        $lookup: {
          from: COLLECTIONS.ORGANISATIONS,
          localField: 'organization_id',
          foreignField: '_id',
          as: 'organisations'
        }
      },
      { $unwind: { path: '$organisations', preserveNullAndEmptyArrays: true } },
      // Join with opportunity_details
      {
        $lookup: {
          from: COLLECTIONS.OPPORTUNITY_DETAILS,
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'opportunity_details'
        }
      },
      { $unwind: { path: '$opportunity_details', preserveNullAndEmptyArrays: true } },
      // Sort by created_at descending
      { $sort: { created_at: -1 } }
    ];

    const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate(pipeline).toArray();

    // Filter opportunities with is_unqualified = 1
    const unqualifiedOpportunities = opportunities
      .filter((opp: any) => opp.opportunity_details?.is_unqualified === 1)
      .map((opp: any) => {
        return {
          id: opp._id,
          opportunity_id: opp.opportunity_id,
          client_entity_name: opp.clients?.entity_name || '',
          client_contact_name: `${opp.clients?.contact_first_name || ''} ${opp.clients?.contact_last_name || ''}`.trim(),
          loan_amount: opp.loan_amount || 0,
          status: opp.status,
          unqualified_date: opp.opportunity_details?.unqualified_date || null,
          unqualified_reason: opp.opportunity_details?.unqualified_reason || '',
          referrer_group: opp.organisations?.company_name || '',
          created_at: opp.created_at,
        };
      });

    return NextResponse.json({
      success: true,
      opportunities: unqualifiedOpportunities,
      count: unqualifiedOpportunities.length
    });

  } catch (error) {
    console.error('Error in unqualified opportunities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
