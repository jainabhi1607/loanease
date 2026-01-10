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

    // Build the match query for opportunities with upcoming settlements
    const matchQuery: any = {
      target_settlement_date: { $ne: null },
      date_settled: null,
      status: { $nin: ['withdrawn', 'declined'] },
    };

    // Filter by organisation for referrers
    if (user.role === 'referrer_admin' || user.role === 'referrer_team') {
      if (user.organisationId) {
        matchQuery.organization_id = user.organisationId;
      } else {
        return NextResponse.json({ settlements: [] }, { status: 200 });
      }
    }

    // Use aggregation to join with clients and organisations
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
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$organisation', preserveNullAndEmptyArrays: true } },
      { $sort: { target_settlement_date: 1 } },
    ]).toArray();

    // Format the response
    const settlements = opportunities?.map((opp: any) => ({
      id: opp._id,
      opportunity_id: opp.opportunity_id,
      entity_name: opp.client?.entity_name || '-',
      referrer_group: opp.organisation?.company_name || '-',
      target_settlement_date: opp.target_settlement_date,
      loan_amount: opp.loan_amount,
      lender: opp.lender || '-',
      status: opp.status,
    })) || [];

    return NextResponse.json({ settlements }, { status: 200 });
  } catch (error) {
    console.error('Error in upcoming settlements API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
