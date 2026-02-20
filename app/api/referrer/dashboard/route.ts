import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  console.log('Referrer Dashboard API - Request received');
  try {
    // Check if user is authenticated
    const user = await getCurrentUserFromRequest(request);

    console.log('Referrer Dashboard API - User:', user?.userId);

    if (!user) {
      console.log('Referrer Dashboard API - No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user details and check role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    console.log('Referrer Dashboard API - User data:', userData?._id, 'Role:', userData?.role, 'OrgId:', userData?.organisation_id);

    if (!userData) {
      console.log('Referrer Dashboard API - User not found in database');
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

    // 1. Open Opportunities (status = 'opportunity', exclude unqualified)
    // First get opportunities
    const openOpportunities = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        ...orgFilter,
        status: 'opportunity',
        deleted_at: null
      })
      .toArray();

    // Get opportunity details for unqualified check
    const openOppIds = openOpportunities.map((o: any) => o._id);
    const openOppDetails = openOppIds.length > 0
      ? await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS)
          .find({ opportunity_id: { $in: openOppIds } })
          .toArray()
      : [];
    const openOppDetailsMap = new Map(openOppDetails.map((d: any) => [d.opportunity_id, d]));

    // Filter out unqualified opportunities
    const filteredOpenOpps = openOpportunities.filter((opp: any) => {
      const details = openOppDetailsMap.get(opp._id);
      return !details?.is_unqualified;
    });
    const openOpportunitiesCount = filteredOpenOpps.length;
    const opportunityValue = filteredOpenOpps.reduce((sum: number, opp: any) => sum + (opp.loan_amount || 0), 0);

    // 2. Open Applications (only active application statuses, not settled/declined/withdrawn)
    const openApplications = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        ...orgFilter,
        status: { $in: ['application_created', 'application_submitted', 'conditionally_approved', 'approved'] },
        deleted_at: null
      })
      .toArray();

    const openAppIds = openApplications.map((o: any) => o._id);
    const openAppDetails = openAppIds.length > 0
      ? await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS)
          .find({ opportunity_id: { $in: openAppIds } })
          .toArray()
      : [];
    const openAppDetailsMap = new Map(openAppDetails.map((d: any) => [d.opportunity_id, d]));

    // Filter out unqualified applications
    const filteredOpenApps = openApplications.filter((opp: any) => {
      const details = openAppDetailsMap.get(opp._id);
      return !details?.is_unqualified;
    });
    const openApplicationsCount = filteredOpenApps.length;

    // 3. Settled Applications (opportunities with date_settled set)
    const settledApplications = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        ...orgFilter,
        date_settled: { $ne: null },
        deleted_at: null
      })
      .toArray();

    const settledAppIds = settledApplications.map((o: any) => o._id);
    const settledAppDetails = settledAppIds.length > 0
      ? await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS)
          .find({ opportunity_id: { $in: settledAppIds } })
          .toArray()
      : [];
    const settledAppDetailsMap = new Map(settledAppDetails.map((d: any) => [d.opportunity_id, d]));

    // Filter out unqualified settled applications
    const filteredSettledApps = settledApplications.filter((opp: any) => {
      const details = settledAppDetailsMap.get(opp._id);
      return !details?.is_unqualified;
    });
    const settledApplicationsCount = filteredSettledApps.length;
    const settledValue = filteredSettledApps.reduce((sum: number, opp: any) => sum + (opp.loan_amount || 0), 0);

    // 4. Total Opportunities (all opportunities, excluding unqualified)
    const totalOpportunities = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        ...orgFilter,
        deleted_at: null
      })
      .toArray();

    const totalOppIds = totalOpportunities.map((o: any) => o._id);
    const totalOppDetails = totalOppIds.length > 0
      ? await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS)
          .find({ opportunity_id: { $in: totalOppIds } })
          .toArray()
      : [];
    const totalOppDetailsMap = new Map(totalOppDetails.map((d: any) => [d.opportunity_id, d]));

    // Filter out unqualified from total opportunities
    const filteredTotalOpps = totalOpportunities.filter((opp: any) => {
      const details = totalOppDetailsMap.get(opp._id);
      return !details?.is_unqualified;
    });
    const totalOpportunitiesCount = filteredTotalOpps.length;

    // 5. Calculate Conversion Ratio (settled / total opportunities * 100 = percentage)
    const conversionRatio = totalOpportunitiesCount > 0
      ? ((settledApplicationsCount / totalOpportunitiesCount) * 100).toFixed(1)
      : '0.0';

    // 6. Fetch recent opportunities (last 10, exclude unqualified)
    const recentOpportunities = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        ...orgFilter,
        deleted_at: null
      })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();

    // Get client IDs for recent opportunities
    const clientIds = [...new Set(recentOpportunities.map((o: any) => o.client_id).filter(Boolean))];
    const clients = clientIds.length > 0
      ? await db.collection(COLLECTIONS.CLIENTS)
          .find({ _id: { $in: clientIds } })
          .toArray()
      : [];
    const clientMap = new Map(clients.map((c: any) => [c._id, c]));

    // Get opportunity details for recent opportunities
    const recentOppIds = recentOpportunities.map((o: any) => o._id);
    const recentOppDetails = recentOppIds.length > 0
      ? await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS)
          .find({ opportunity_id: { $in: recentOppIds } })
          .toArray()
      : [];
    const recentOppDetailsMap = new Map(recentOppDetails.map((d: any) => [d.opportunity_id, d]));

    // Filter out unqualified and take only 10
    const filteredRecentOpps = recentOpportunities
      .filter((opp: any) => {
        const details = recentOppDetailsMap.get(opp._id);
        return !details?.is_unqualified;
      })
      .slice(0, 10);

    const formattedOpportunities = filteredRecentOpps.map((opp: any) => {
      const client = clientMap.get(opp.client_id);
      return {
        id: opp._id,
        opportunity_id: opp.opportunity_id,
        status: opp.status,
        created_at: opp.created_at,
        loan_amount: opp.loan_amount || 0,
        loan_type: opp.loan_type || '',
        asset_type: opp.asset_type || '',
        borrowing_entity: client?.entity_name || '',
        contact_name: client
          ? `${client.contact_first_name || ''} ${client.contact_last_name || ''}`.trim()
          : '',
      };
    });

    // Get organization details (only for non-admin users)
    const organization = !isAdmin && organisationId
      ? await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: organisationId as any })
      : null;

    console.log('Referrer Dashboard API - Stats:', {
      isAdmin,
      openOpportunities: openOpportunitiesCount,
      openApplications: openApplicationsCount,
      settledApplications: settledApplicationsCount,
      settledValue,
      conversionRatio,
    });

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
