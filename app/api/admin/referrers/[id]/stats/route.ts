import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as per Next.js 15 requirements
    const { id: referrerId } = await params;

    // First check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Get the referrer organization_id
    const referrerData = await db.collection('users').findOne({ _id: referrerId as any });

    if (!referrerData || !referrerData.organisation_id) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    const organisationId = referrerData.organisation_id;

    // Calculate all stats in a single aggregation pipeline
    const statsResult = await db.collection('opportunities').aggregate([
      { $match: { organization_id: organisationId, deleted_at: null } },
      {
        $group: {
          _id: null,
          openOpportunities: { $sum: { $cond: [{ $eq: ['$status', 'opportunity'] }, 1, 0] } },
          opportunitiesValue: { $sum: { $cond: [{ $eq: ['$status', 'opportunity'] }, { $ifNull: ['$loan_amount', 0] }, 0] } },
          openApplications: { $sum: { $cond: [{ $in: ['$status', ['application_created', 'application_submitted', 'conditionally_approved', 'approved']] }, 1, 0] } },
          settledApplications: { $sum: { $cond: [{ $eq: ['$status', 'settled'] }, 1, 0] } },
          totalSettledValue: { $sum: { $cond: [{ $eq: ['$status', 'settled'] }, { $ifNull: ['$loan_amount', 0] }, 0] } },
          totalApplications: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'withdrawn'] }, { $ne: ['$status', 'draft'] }, { $ne: ['$status', 'declined'] }] }, 1, 0] } },
        }
      }
    ]).toArray();

    const stats = statsResult[0] || {
      openOpportunities: 0, opportunitiesValue: 0, openApplications: 0,
      settledApplications: 0, totalSettledValue: 0, totalApplications: 0
    };

    const conversionRatio = stats.totalApplications > 0
      ? Number((stats.settledApplications * 100 / stats.totalApplications).toFixed(2))
      : 0;

    return NextResponse.json({
      stats: {
        open_opportunities: stats.openOpportunities,
        opportunities_value: stats.opportunitiesValue,
        open_applications: stats.openApplications,
        settled_applications: stats.settledApplications,
        total_settled_value: stats.totalSettledValue,
        conversion_ratio: conversionRatio
      }
    });

  } catch (error) {
    console.error('Error fetching referrer stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
