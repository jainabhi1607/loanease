import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['super_admin', 'admin_team'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Get contact details before deletion for audit log
    const contact = await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS).findOne({ _id: id as any });

    // Delete the contact
    const result = await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS).deleteOne({ _id: id as any });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Log the deletion
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: new ObjectId().toString() as any,
      user_id: user.userId,
      table_name: 'pre_assessment_contacts',
      record_id: id,
      action: 'delete',
      old_value: JSON.stringify(contact),
      ip_address: ip,
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting potential referrer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
