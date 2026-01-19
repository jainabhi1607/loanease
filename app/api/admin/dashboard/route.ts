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

    // 1. Number of Opportunities (status = 'opportunity', exclude unqualified)
    const opportunities = await db.collection('opportunities').aggregate([
      { $match: { status: 'opportunity', deleted_at: null } },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] } }
    ]).toArray();
    const numberOfOpportunities = opportunities.length;

    // 2. Number of Applications (status >= application_created, exclude unqualified)
    const applicationStatuses = [
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'declined',
      'settled',
      'withdrawn'
    ];
    const applications = await db.collection('opportunities').aggregate([
      { $match: { status: { $in: applicationStatuses }, deleted_at: null } },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] } }
    ]).toArray();
    const numberOfApplications = applications.length;

    // 3. Total Loans Settled (By Volume) - sum of loan_amount where date_settled is set
    const settledLoans = await db.collection('opportunities').aggregate([
      { $match: { date_settled: { $ne: null }, deleted_at: null } },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] } }
    ]).toArray();

    const totalLoansSettledVolume = settledLoans.reduce(
      (sum: number, opp: any) => sum + (opp.loan_amount || 0),
      0
    );

    // 4. Total Loans Settled (By Unit) - count of opportunities with date_settled
    const totalLoansSettledUnit = settledLoans.length;

    // 5. Settlement Conversion Ratio (settled / total opportunities * 100)
    const allOpportunities = await db.collection('opportunities').aggregate([
      { $match: { deleted_at: null } },
      {
        $lookup: {
          from: 'opportunity_details',
          localField: '_id',
          foreignField: 'opportunity_id',
          as: 'details'
        }
      },
      { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'details.is_unqualified': { $ne: 1 } }, { details: null }] } }
    ]).toArray();
    const totalOpportunitiesCount = allOpportunities.length;

    const conversionRatio = totalOpportunitiesCount > 0
      ? ((totalLoansSettledUnit / totalOpportunitiesCount) * 100).toFixed(1)
      : '0.0';

    // 6. New Opportunities for Current Month (limit 10)
    const newOpportunities = await db.collection('opportunities').aggregate([
      {
        $match: {
          created_at: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
          deleted_at: null
        }
      },
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
    ]).toArray();

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

    // 7. New Referrers (limit 10, most recent first)
    const newReferrers = await db.collection('users').aggregate([
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
    ]).toArray();

    const formattedReferrers = newReferrers.map((ref: any) => ({
      id: ref._id,
      name: ref.first_name && ref.surname
        ? `${ref.first_name} ${ref.surname}`
        : ref.organisation?.company_name || ref.email,
      status: ref.organisation?.is_active !== false ? 'Active' : 'Inactive',
    }));

    // Get user details for welcome message
    const currentUser = await db.collection('users').findOne({ _id: user.userId as any });
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
      currentMonth: now.toLocaleString('en-AU', { month: 'long' }),
      userName,
    });

  } catch (error) {
    console.error('Error in admin dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
