import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user's organization and check role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer
    if (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!userData.organisation_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Fetch client details - ensure it belongs to the user's organization
    const client = await db.collection(COLLECTIONS.CLIENTS).findOne({
      _id: clientId as any,
      organisation_id: userData.organisation_id,
      deleted_at: null
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch all opportunities for this client (scoped to organization)
    const opportunities = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({
        client_id: clientId,
        organization_id: userData.organisation_id
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get unique user IDs (referrers)
    const userIds = [...new Set(opportunities.map((o: any) => o.created_by).filter(Boolean))];

    // Fetch users
    const users = userIds.length > 0
      ? await db.collection(COLLECTIONS.USERS)
          .find({ _id: { $in: userIds as any } })
          .toArray()
      : [];

    // Create user map
    const userMap = new Map(users.map((u: any) => [u._id, u]));

    // Calculate total finance amount
    const totalFinanceAmount = opportunities.reduce((sum: number, opp: any) => {
      return sum + (opp.loan_amount || 0);
    }, 0);

    // Get upcoming settlements (opportunities with target_settlement_date but not settled)
    const upcomingSettlements = opportunities.filter((opp: any) =>
      opp.target_settlement_date && opp.status !== 'settled' && opp.status !== 'withdrawn'
    );

    // Format opportunities with referrer details
    const formattedOpportunities = opportunities.map((opp: any) => {
      const referrer = userMap.get(opp.created_by);
      return {
        id: opp._id,
        opportunity_id: opp.opportunity_id,
        date_created: opp.created_at,
        borrowing_entity: client.entity_name || `${client.contact_first_name || ''} ${client.contact_last_name || ''}`.trim(),
        referrer_name: referrer ? `${referrer.first_name} ${referrer.surname}`.trim() : '-',
        loan_amount: opp.loan_amount,
        status: opp.status,
      };
    });

    return NextResponse.json({
      client: {
        id: client._id,
        entity: client.entity || '',
        entity_name: client.entity_name || '-',
        borrower_contact: `${client.contact_first_name || ''} ${client.contact_last_name || ''}`.trim() || '-',
        mobile: client.contact_phone || '-',
        email: client.contact_email || '-',
        industry: client.industry || '-',
        company_address: client.address || '-',
        abn: client.abn || '-',
        time_in_business: client.time_in_business || '-',
      },
      total_finance_amount: totalFinanceAmount,
      upcoming_settlements: upcomingSettlements.length,
      opportunities: formattedOpportunities,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in referrer client detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update client details (for referrer_admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get user's organization and check role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only referrer_admin can edit clients
    if (userData.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!userData.organisation_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Verify client belongs to referrer's organization
    const existingClient = await db.collection(COLLECTIONS.CLIENTS).findOne({
      _id: clientId as any,
      organisation_id: userData.organisation_id,
      deleted_at: null
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { entity, contact_first_name, contact_last_name, contact_phone, contact_email, address } = body;

    // Build update object
    // Note: industry is NOT on clients table - it's on opportunities table
    const updateData: Record<string, any> = {};
    if (entity !== undefined && entity !== '') {
      const entityInt = parseInt(entity, 10);
      if (!isNaN(entityInt)) {
        updateData.entity = entityInt;
      }
    }
    if (contact_first_name !== undefined) updateData.contact_first_name = contact_first_name || null;
    if (contact_last_name !== undefined) updateData.contact_last_name = contact_last_name || null;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone || null;
    if (contact_email !== undefined) updateData.contact_email = contact_email || null;
    if (address !== undefined) updateData.address = address || null;

    console.log('Updating client:', clientId, 'with data:', updateData);

    // Update client
    await db.collection(COLLECTIONS.CLIENTS).updateOne(
      { _id: clientId as any },
      { $set: updateData }
    );

    // Get IP for audit log
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Log to audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'clients',
      record_id: clientId,
      action: 'update',
      field_name: 'client_details',
      new_value: JSON.stringify(updateData),
      ip_address: ip,
      created_at: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
