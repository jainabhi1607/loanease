import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params;

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Check if user is authenticated and is a super admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admins can cancel invitations' }, { status: 403 });
    }

    const db = await getDatabase();

    // Check if invitation exists
    const invitation = await db.collection('user_invitations').findOne(
      { _id: invitationId as any },
      { projection: { email: 1, status: 1 } }
    );

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Can only cancel pending invitations' }, { status: 400 });
    }

    // Cancel invitation by deleting it
    const result = await db.collection('user_invitations').deleteOne({ _id: invitationId as any });

    if (result.deletedCount === 0) {
      console.error('Error cancelling invitation: no document deleted');
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    // Log the action
    await db.collection('audit_logs').insertOne({
      user_id: user.userId,
      table_name: 'user_invitations',
      record_id: invitationId,
      action: 'delete',
      field_name: 'invitation_cancelled',
      new_value: `Admin invitation cancelled for ${invitation.email}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error in cancel invitation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
