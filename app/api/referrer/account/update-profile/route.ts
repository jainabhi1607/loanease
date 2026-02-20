import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { hashPassword } from '@/lib/auth/password';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Check if user has referrer role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['referrer_admin', 'referrer_team'].includes(userData.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { first_name, surname, email, phone, state, new_password } = body;

    // Validate required fields for profile update
    if (first_name !== undefined || surname !== undefined || email !== undefined || phone !== undefined || state !== undefined) {
      const updateData: Record<string, string> = {};
      if (first_name !== undefined) updateData.first_name = first_name;
      if (surname !== undefined) updateData.surname = surname;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (state !== undefined) updateData.state = state;

      // Update the users collection
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: user.userId as any },
        { $set: updateData }
      );

      // If email changed, also update auth_users collection
      if (email !== undefined && email !== userData.email) {
        await db.collection(COLLECTIONS.AUTH_USERS).updateOne(
          { _id: user.userId as any },
          { $set: { email: email } }
        );
      }
    }

    // Handle password change
    if (new_password) {
      // Validate password length
      if (new_password.length < 10) {
        return NextResponse.json(
          { error: 'Password must be at least 10 characters long' },
          { status: 400 }
        );
      }

      // Hash the new password
      const hashedPassword = await hashPassword(new_password);

      // Update password in auth_users collection
      await db.collection(COLLECTIONS.AUTH_USERS).updateOne(
        { _id: user.userId as any },
        { $set: { password_hash: hashedPassword } }
      );

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
        passwordUpdated: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      passwordUpdated: false
    });
  } catch (error) {
    console.error('Error in update-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
