import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    if (!['super_admin', 'admin_team', 'referrer_admin', 'referrer_team'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Build the match query for settlements:
    // Applications that have date_settled set OR deal_finalisation_status set (closed)
    const matchQuery: any = {
      deleted_at: null,
    };

    // Filter by organisation for referrers
    if (user.role === 'referrer_admin' || user.role === 'referrer_team') {
      if (user.organisationId) {
        matchQuery.organization_id = user.organisationId;
      } else {
        return NextResponse.json({ settlements: [] }, { status: 200 });
      }
    }

    // Use aggregation to join with clients, organisations, and opportunity_details
    const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: COLLECTIONS.CLIENTS,
          localField: 'client_id',
          foreignField: '_id',
          as: 'client',
        },
      },
      {
        $lookup: {
          from: COLLECTIONS.ORGANISATIONS,
          localField: 'organization_id',
          foreignField: '_id',
          as: 'organisation',
        },
      },
      {
        $lookup: {
          from: COLLECTIONS.OPPORTUNITY_DETAILS,
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'opportunity_details',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$organisation', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$opportunity_details', preserveNullAndEmptyArrays: true } },
      // Filter: date_settled is set OR deal_finalisation_status is set
      {
        $match: {
          $or: [
            { date_settled: { $ne: null } },
            { 'opportunity_details.deal_finalisation_status': { $exists: true, $nin: [null, ''] } },
          ],
        },
      },
      { $sort: { date_settled: -1, target_settlement_date: -1 } },
    ]).toArray();

    // Format the response
    const settlements = opportunities?.map((opp: any) => {
      const hasDealFinalisation = !!opp.opportunity_details?.deal_finalisation_status;
      return {
        id: opp._id,
        opportunity_id: opp.opportunity_id,
        entity_name: opp.client?.entity_name || '-',
        referrer_group: opp.organisation?.company_name || '-',
        target_settlement_date: opp.target_settlement_date || null,
        date_settled: opp.date_settled || null,
        loan_amount: opp.loan_amount,
        lender: opp.lender || '-',
        status: opp.status,
        is_closed: hasDealFinalisation,
      };
    }) || [];

    return NextResponse.json({ settlements }, { status: 200 });
  } catch (error) {
    console.error('Error in settlements API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
