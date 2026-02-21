import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { v4 as uuidv4 } from 'uuid';

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

    // Fetch client details
    const client = await db.collection('clients').findOne({ _id: clientId as any });

    if (!client) {
      console.error('Client not found with ID:', clientId);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch organisation separately
    let referrerGroup = '';
    if (client.organisation_id) {
      const org = await db.collection('organisations').findOne(
        { _id: client.organisation_id as any },
        { projection: { company_name: 1 } }
      );
      referrerGroup = org?.company_name || '';
    }

    // Fetch all opportunities for this client
    const opportunities = await db.collection('opportunities')
      .find({ client_id: clientId })
      .project({
        _id: 1,
        opportunity_id: 1,
        status: 1,
        loan_amount: 1,
        created_at: 1,
        created_by: 1,
        target_settlement_date: 1
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get unique user IDs (referrers)
    const userIds = [...new Set(opportunities?.map((o: any) => o.created_by).filter(Boolean))];

    // Fetch users
    const users = userIds.length > 0
      ? await db.collection('users')
          .find({ _id: { $in: userIds } })
          .project({ _id: 1, first_name: 1, surname: 1 })
          .toArray()
      : [];

    // Create user map
    const userMap = new Map(users?.map((u: any) => [u._id, u]) || []);

    // Calculate total finance amount
    const totalFinanceAmount = opportunities?.reduce((sum: number, opp: any) => {
      return sum + (opp.loan_amount || 0);
    }, 0) || 0;

    // Get upcoming settlements (opportunities with target_settlement_date but not settled)
    const upcomingSettlements = opportunities?.filter((opp: any) =>
      opp.target_settlement_date && opp.status !== 'settled' && opp.status !== 'withdrawn'
    ) || [];

    // Format opportunities with referrer details
    const formattedOpportunities = opportunities?.map((opp: any) => {
      const referrer = userMap.get(opp.created_by);
      return {
        id: opp._id,
        opportunity_id: opp.opportunity_id,
        date_created: opp.created_at,
        borrowing_entity: client.entity_name || `${client.contact_first_name || ''} ${client.contact_last_name || ''}`.trim(),
        referrer_name: referrer ? `${referrer.first_name} ${referrer.surname}`.trim() : '-',
        referrer_type: '', // Not stored in current schema
        loan_amount: opp.loan_amount,
        status: opp.status,
      };
    }) || [];

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
        referrer_group: referrerGroup,
      },
      total_finance_amount: totalFinanceAmount,
      upcoming_settlements: upcomingSettlements.length,
      opportunities: formattedOpportunities,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in client detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Check if client has any active (non-deleted) opportunities
    const activeOpportunities = await db.collection(COLLECTIONS.OPPORTUNITIES).countDocuments({
      client_id: clientId,
      deleted_at: null,
      status: { $nin: ['withdrawn'] }
    });

    if (activeOpportunities > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with active opportunities. Please withdraw or delete all opportunities first.' },
        { status: 400 }
      );
    }

    // Soft delete the client
    const deleteResult = await db.collection(COLLECTIONS.CLIENTS).updateOne(
      { _id: clientId as any, deleted_at: null },
      { $set: { deleted_at: new Date() } }
    );

    if (deleteResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Client not found or already deleted' }, { status: 404 });
    }

    // Log the deletion in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: uuidv4() as any,
      user_id: user.userId,
      table_name: 'clients',
      record_id: clientId,
      action: 'delete',
      field_name: 'deleted_at',
      old_value: null,
      new_value: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
