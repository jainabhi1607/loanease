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

    // Get current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const applicationStatuses = [
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'declined',
      'settled',
      'withdrawn'
    ];

    // Single aggregation for all dashboard stats (replaces 4 separate full-scan queries)
    const unqualifiedFilter = { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] };
    const detailsLookup = {
      $lookup: {
        from: 'opportunity_details',
        localField: '_id',
        foreignField: 'opportunity_id',
        as: 'details'
      }
    };

    const [statsResult, newOpportunities, newReferrers, currentUser] = await Promise.all([
      // 1-5: All stats in a single aggregation
      db.collection('opportunities').aggregate([
        { $match: { deleted_at: null } },
        detailsLookup,
        { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
        { $match: unqualifiedFilter },
        {
          $group: {
            _id: null,
            numberOfOpportunities: {
              $sum: { $cond: [{ $eq: ['$status', 'opportunity'] }, 1, 0] }
            },
            numberOfApplications: {
              $sum: { $cond: [{ $in: ['$status', applicationStatuses] }, 1, 0] }
            },
            totalLoansSettledVolume: {
              $sum: { $cond: [{ $ne: ['$date_settled', null] }, { $ifNull: ['$loan_amount', 0] }, 0] }
            },
            totalLoansSettledUnit: {
              $sum: { $cond: [{ $ne: ['$date_settled', null] }, 1, 0] }
            },
            totalCount: { $sum: 1 }
          }
        }
      ]).toArray(),

      // 6: New Opportunities for Current Month (limit 10)
      db.collection('opportunities').aggregate([
        {
          $match: {
            created_at: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
            deleted_at: null
          }
        },
        detailsLookup,
        { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
        { $match: unqualifiedFilter },
        {
          $lookup: {
            from: 'clients',
            localField: 'client_id',
            foreignField: '_id',
            as: 'client'
          }
        },
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
        { $sort: { created_at: -1 } },
        { $limit: 10 }
      ]).toArray(),

      // 7: New Referrers (limit 10)
      db.collection('users').aggregate([
        { $match: { role: 'referrer_admin' } },
        {
          $lookup: {
            from: 'organisations',
            localField: 'organisation_id',
            foreignField: '_id',
            as: 'organisation'
          }
        },
        { $unwind: { path: '$organisation', preserveNullAndEmptyArrays: true } },
        { $sort: { created_at: -1 } },
        { $limit: 10 }
      ]).toArray(),

      // Current user for welcome message
      db.collection('users').findOne({ _id: user.userId as any })
    ]);

    const stats = statsResult[0] || {
      numberOfOpportunities: 0,
      numberOfApplications: 0,
      totalLoansSettledVolume: 0,
      totalLoansSettledUnit: 0,
      totalCount: 0
    };

    const { numberOfOpportunities, numberOfApplications, totalLoansSettledVolume, totalLoansSettledUnit, totalCount: totalOpportunitiesCount } = stats;

    const conversionRatio = totalOpportunitiesCount > 0
      ? ((totalLoansSettledUnit / totalOpportunitiesCount) * 100).toFixed(1)
      : '0.0';

    // Get user IDs to fetch referrer names
    const userIds = [...new Set(newOpportunities.map((opp: any) => opp.created_by).filter(Boolean))];
    const users = userIds.length > 0
      ? await db.collection('users').find({ _id: { $in: userIds } }).toArray()
      : [];
    const userMap = new Map(users.map((u: any) => [u._id, u]));

    const formattedNewOpportunities = newOpportunities.map((opp: any) => {
      const client = opp.client;
      const creator = userMap.get(opp.created_by);

      return {
        id: opp._id,
        deal_id: opp.opportunity_id,
        borrower_name: client?.entity_name ||
          (client?.contact_first_name && client?.contact_last_name
            ? `${client.contact_first_name} ${client.contact_last_name}`
            : '-'),
        referrer_name: creator?.first_name && creator?.surname
          ? `${creator.first_name} ${creator.surname}`
          : '-',
        loan_type: opp.loan_type || '',
        loan_amount: opp.loan_amount || 0,
      };
    });

    const formattedReferrers = newReferrers.map((ref: any) => ({
      id: ref._id,
      name: ref.first_name && ref.surname
        ? `${ref.first_name} ${ref.surname}`
        : ref.organisation?.company_name || ref.email,
      status: ref.organisation?.is_active !== false ? 'Active' : 'Inactive',
    }));

    const userName = currentUser?.first_name || 'Admin';

    return NextResponse.json({
      statistics: {
        numberOfOpportunities,
        numberOfApplications,
        totalLoansSettledVolume,
        totalLoansSettledUnit,
        conversionRatio,
      },
      newOpportunities: formattedNewOpportunities,
      newReferrers: formattedReferrers,
      currentMonth: now.toLocaleString('en-IN', { month: 'long' }),
      userName,
    });

  } catch (error) {
    console.error('Error in admin dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
