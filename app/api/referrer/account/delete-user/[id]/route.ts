import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get current user role and organization
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer admin
    if (userData.role !== 'referrer_admin') {
      return NextResponse.json({ error: 'Forbidden - Only admins can delete users' }, { status: 403 });
    }

    const organisationId = userData.organisation_id;

    if (!organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the user to be deleted
    const targetUser = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId as any });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure the target user belongs to the same organization
    if (targetUser.organisation_id !== organisationId) {
      return NextResponse.json({ error: 'Forbidden - User not in your organization' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (userId === user.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    console.log('Deleting user:', userId);

    // Delete user from auth_users collection
    await db.collection(COLLECTIONS.AUTH_USERS).deleteOne({ _id: userId as any });

    console.log('User deleted from auth successfully');

    // Delete user profile from users collection
    await db.collection(COLLECTIONS.USERS).deleteOne({ _id: userId as any });

    console.log('User profile deleted successfully');

    // Log the action in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'users',
      action: 'delete',
      changes: {
        deleted_user_id: userId,
        deleted_user_email: targetUser.email,
        deleted_user_name: `${targetUser.first_name} ${targetUser.surname}`,
      },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
