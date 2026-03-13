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

    const db = await getDatabase();

    // Get user details and check role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer or admin
    const allowedRoles = ['referrer_admin', 'referrer_team', 'super_admin', 'admin_team'];
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = userData.organisation_id;
    const isAdmin = userData.role === 'super_admin' || userData.role === 'admin_team';

    // Build the organization filter - admins see all data
    const orgFilter = isAdmin ? {} : { organization_id: organisationId };

    const activeAppStatuses = ['application_created', 'application_submitted', 'conditionally_approved', 'approved'];
    const unqualifiedFilter = { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] };

    // Single aggregation for all dashboard stats (replaces 8 separate queries)
    const statsResult = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
      { $match: { ...orgFilter, deleted_at: null } },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: unqualifiedFilter },
      {
        $group: {
          _id: null,
          openOpportunities: {
            $sum: { $cond: [{ $eq: ['$status', 'opportunity'] }, 1, 0] }
          },
          opportunityValue: {
            $sum: { $cond: [{ $eq: ['$status', 'opportunity'] }, { $ifNull: ['$loan_amount', 0] }, 0] }
          },
          openApplications: {
            $sum: { $cond: [{ $in: ['$status', activeAppStatuses] }, 1, 0] }
          },
          settledApplications: {
            $sum: { $cond: [{ $ne: ['$date_settled', null] }, 1, 0] }
          },
          settledValue: {
            $sum: { $cond: [{ $ne: ['$date_settled', null] }, { $ifNull: ['$loan_amount', 0] }, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = statsResult[0] || {
      openOpportunities: 0, opportunityValue: 0, openApplications: 0,
      settledApplications: 0, settledValue: 0, totalCount: 0
    };

    const { openOpportunities: openOpportunitiesCount, opportunityValue, openApplications: openApplicationsCount,
      settledApplications: settledApplicationsCount, settledValue, totalCount: totalOpportunitiesCount } = stats;

    // Calculate Conversion Ratio
    const conversionRatio = totalOpportunitiesCount > 0
      ? ((settledApplicationsCount / totalOpportunitiesCount) * 100).toFixed(1)
      : '0.0';

    // Fetch recent opportunities using aggregation (excludes unqualified in pipeline)
    const recentOppsResult = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate([
      { $match: { ...orgFilter, deleted_at: null } },
      { $sort: { created_at: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'clients',
          localField: 'client_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    ]).toArray();

    const formattedOpportunities = recentOppsResult.map((opp: any) => ({
      id: opp._id,
      opportunity_id: opp.opportunity_id,
      status: opp.status,
      created_at: opp.created_at,
      loan_amount: opp.loan_amount || 0,
      loan_type: opp.loan_type || '',
      asset_type: opp.asset_type || '',
      borrowing_entity: opp.client?.entity_name || '',
      contact_name: opp.client
        ? `${opp.client.contact_first_name || ''} ${opp.client.contact_last_name || ''}`.trim()
        : '',
    }));

    // Get organization details (only for non-admin users)
    const organization = !isAdmin && organisationId
      ? await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: organisationId as any })
      : null;

    return NextResponse.json({
      statistics: {
        openOpportunities: openOpportunitiesCount,
        opportunityValue: opportunityValue,
        openApplications: openApplicationsCount,
        settledApplications: settledApplicationsCount,
        settledValue: settledValue,
        conversionRatio: conversionRatio,
      },
      recentOpportunities: formattedOpportunities,
      organization: organization ? {
        id: organization._id,
        company_name: organization.company_name,
        user: organization.user_id ? { id: organization.user_id } : null,
      } : null,
    });

  } catch (error) {
    console.error('Error in referrer dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
