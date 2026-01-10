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

    // Get all users in the organization (for filtering opportunities)
    const orgUsers = await db.collection('users')
      .find({ organisation_id: organisationId })
      .toArray();

    const userIds = orgUsers?.map((u: any) => u._id) || [];
    if (userIds.length === 0) {
      // No users, return zeros
      return NextResponse.json({
        stats: {
          open_opportunities: 0,
          opportunities_value: 0,
          open_applications: 0,
          settled_applications: 0,
          total_settled_value: 0,
          conversion_ratio: 0
        }
      });
    }

    // Fetch all opportunities for this organization
    const opportunities = await db.collection('opportunities')
      .find({
        organization_id: organisationId,
        deleted_at: null
      })
      .toArray();

    // Calculate statistics based on old logic
    // application_status: 1 = opportunity (open leads)
    // application_status: 2 = application (open applications)
    // application_status: 20 = some special status to exclude
    // Status mapping:
    // - opportunity = open leads (status: 'opportunity')
    // - application_created, application_submitted = open applications
    // - settled = settled applications
    // - NOT withdrawn/declined = total applications

    const openOpportunities = opportunities.filter((o: any) => o.status === 'opportunity').length;

    const opportunitiesValue = opportunities
      .filter((o: any) => o.status === 'opportunity')
      .reduce((sum: number, o: any) => sum + (o.loan_amount || 0), 0);

    const openApplications = opportunities.filter((o: any) =>
      o.status === 'application_created' ||
      o.status === 'application_submitted' ||
      o.status === 'conditionally_approved' ||
      o.status === 'approved'
    ).length;

    const settledApplications = opportunities.filter((o: any) => o.status === 'settled').length;

    const totalSettledValue = opportunities
      .filter((o: any) => o.status === 'settled')
      .reduce((sum: number, o: any) => sum + (o.loan_amount || 0), 0);

    // Total applications = all except withdrawn and draft
    const totalApplications = opportunities.filter((o: any) =>
      o.status !== 'withdrawn' && o.status !== 'draft' && o.status !== 'declined'
    ).length;

    // Conversion ratio = settled / total * 100
    const conversionRatio = totalApplications > 0
      ? Number((settledApplications * 100 / totalApplications).toFixed(2))
      : 0;

    return NextResponse.json({
      stats: {
        open_opportunities: openOpportunities,
        opportunities_value: opportunitiesValue,
        open_applications: openApplications,
        settled_applications: settledApplications,
        total_settled_value: totalSettledValue,
        conversion_ratio: conversionRatio
      }
    });

  } catch (error) {
    console.error('Error fetching referrer stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
