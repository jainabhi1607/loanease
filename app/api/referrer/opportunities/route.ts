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

    // Check if user is a referrer (referrer_admin or referrer_team)
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Build match stage for aggregation
    const matchStage: any = {
      organization_id: user.organisationId,
      deleted_at: null,
    };

    // Apply status filtering
    if (statusFilter === 'opportunity') {
      matchStage.status = 'opportunity';
    } else if (statusFilter === 'draft') {
      matchStage.status = 'draft';
    } else if (statusFilter === 'applications') {
      matchStage.status = {
        $in: [
          'application_created',
          'application_submitted',
          'conditionally_approved',
          'approved',
          'declined',
          'settled',
          'withdrawn'
        ]
      };
    }

    // Aggregate with lookups
    const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
      { $match: matchStage },
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
      { $sort: { created_at: -1 } },
      {
        $project: {
          id: '$_id',
          opportunity_id: 1,
          status: 1,
          created_at: 1,
          loan_amount: 1,
          loan_type: 1,
          organization_id: 1,
          'client.entity_name': 1,
          'client.contact_first_name': 1,
          'client.contact_last_name': 1,
          'opportunity_details.is_unqualified': 1
        }
      }
    ]).toArray();

    // Filter out unqualified opportunities and format data
    const formattedOpportunities = opportunities
      .filter((opp: any) => !opp.opportunity_details?.is_unqualified)
      .map((opp: any) => ({
        id: opp._id,
        opportunity_id: opp.opportunity_id,
        status: opp.status,
        created_at: opp.created_at,
        loan_amount: opp.loan_amount || 0,
        loan_type: opp.loan_type || '',
        borrowing_entity: opp.client?.entity_name || '',
        contact_name: opp.client
          ? `${opp.client.contact_first_name || ''} ${opp.client.contact_last_name || ''}`.trim()
          : '',
      }));

    return NextResponse.json(formattedOpportunities);

  } catch (error) {
    console.error('Error in referrer opportunities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
