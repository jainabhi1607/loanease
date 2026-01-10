import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();

    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Prepare update object for clients table
    // Note: clients table does NOT have 'industry', 'address', or 'updated_at' columns
    // - industry is stored on opportunities.industry (per-opportunity)
    // - address is stored on opportunity_details.client_address
    // - only created_at timestamp exists (no updated_at)
    const updateData: Record<string, any> = {};

    // Only update fields that exist on clients table
    if (body.entity !== undefined) updateData.entity = body.entity;
    if (body.entity_name !== undefined) updateData.entity_name = body.entity_name;
    if (body.contact_first_name !== undefined) updateData.contact_first_name = body.contact_first_name;
    if (body.contact_last_name !== undefined) updateData.contact_last_name = body.contact_last_name;
    if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone;
    if (body.contact_email !== undefined) updateData.contact_email = body.contact_email;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update client
    const result = await db.collection('clients').findOneAndUpdate(
      { _id: clientId as any },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      console.error('Client not found for update:', clientId);
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    // Log to audit
    await db.collection('audit_logs').insertOne({
      user_id: user.userId,
      table_name: 'clients',
      record_id: clientId,
      action: 'update',
      changes: updateData,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ client: result }, { status: 200 });
  } catch (error) {
    console.error('Error in client update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
