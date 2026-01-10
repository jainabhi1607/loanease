import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import bcrypt from 'bcryptjs';

export async function PATCH(
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
      return NextResponse.json({ error: 'Forbidden - Only admins can update users' }, { status: 403 });
    }

    const organisationId = userData.organisation_id;

    if (!organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the user to be updated
    const targetUser = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId as any });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure the target user belongs to the same organization
    if (targetUser.organisation_id !== organisationId) {
      return NextResponse.json({ error: 'Forbidden - User not in your organization' }, { status: 403 });
    }

    const body = await request.json();
    const { first_name, surname, phone, email, role, state, is_active } = body;

    // Check if email is being changed
    if (email && email !== targetUser.email) {
      // Check if new email is already in use
      const existingUser = await db.collection(COLLECTIONS.USERS).findOne({
        email: email,
        _id: { $ne: userId as any }
      });

      if (existingUser) {
        return NextResponse.json({
          error: 'Email is already in use by another user'
        }, { status: 400 });
      }

      // Update email in auth_users collection
      await db.collection(COLLECTIONS.AUTH_USERS).updateOne(
        { _id: userId as any },
        { $set: { email: email } }
      );
    }

    // Update user profile in users collection
    const updateData: Record<string, any> = {
      first_name,
      surname,
      phone,
      role,
      state: state || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    // Only update email if it changed
    if (email && email !== targetUser.email) {
      updateData.email = email;
    }

    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: userId as any },
      { $set: updateData }
    );

    console.log('User profile updated successfully');

    // Log the action in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'users',
      action: 'update',
      changes: {
        user_id: userId,
        first_name,
        surname,
        phone,
        email,
        role,
        state,
        is_active,
      },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
