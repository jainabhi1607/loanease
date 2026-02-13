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

    // Check user role
    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get optional query parameters for filtering
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const statusFilter = searchParams.get('status'); // e.g., "opportunity" or "applications"

    const db = await getDatabase();

    // Build match conditions
    const matchConditions: any = {
      deleted_at: null
    };

    // Apply organization filter if provided
    if (organizationId) {
      matchConditions.organization_id = organizationId;
    }

    // Apply status filter if provided
    if (statusFilter === 'opportunity') {
      matchConditions.status = 'opportunity';
    } else if (statusFilter === 'draft') {
      matchConditions.status = 'draft';
    } else if (statusFilter === 'applications') {
      matchConditions.status = {
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

    // Use aggregation pipeline to join with related collections
    const pipeline = [
      { $match: matchConditions },
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

    // Filter out unqualified opportunities ONLY when viewing opportunities or applications pages
    const filteredOpportunities = opportunities.filter((opp: any) => {
      // If no status filter, show all (including unqualified for admin)
      if (!statusFilter) {
        return true;
      }
      // If filtering by status (opportunity or applications), exclude unqualified
      return !opp.opportunity_details || opp.opportunity_details.is_unqualified !== 1;
    });

    // Get unique user IDs and fetch users separately (no FK relationship exists)
    const userIds = [...new Set(filteredOpportunities.map((opp: any) => opp.created_by).filter(Boolean))];

    let usersMap = new Map();
    if (userIds.length > 0) {
      const users = await db.collection(COLLECTIONS.USERS)
        .find({ _id: { $in: userIds } })
        .project({ _id: 1, first_name: 1, surname: 1 })
        .toArray();
      usersMap = new Map(users.map((u: any) => [u._id, u]));
    }

    // Transform the data
    const transformedOpportunities = filteredOpportunities.map((opp: any) => {
      const client = opp.clients;
      const org = opp.organisations;
      const creator = usersMap.get(opp.created_by);

      // Get borrowing entity name
      const borrowingEntity = client?.entity_name ||
        (client?.contact_first_name && client?.contact_last_name
          ? `${client.contact_first_name} ${client.contact_last_name}`
          : '');

      // Get referrer name
      const referrerName = creator?.first_name && creator?.surname
        ? `${creator.first_name} ${creator.surname}`
        : '';

      return {
        id: opp._id,
        deal_id: opp.opportunity_id,
        date_created: opp.created_at,
        borrowing_entity: borrowingEntity,
        loan_type: opp.loan_type || '',
        referrer_name: referrerName,
        referrer_type: org?.company_name || '',
        loan_amount: opp.loan_amount || 0,
        status: opp.status || 'draft',
        deal_finalisation_status: opp.opportunity_details?.deal_finalisation_status || null,
        completed_declined_reason: opp.completed_declined_reason || null
      };
    });

    return NextResponse.json({ opportunities: transformedOpportunities });

  } catch (error) {
    console.error('Error in opportunities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
