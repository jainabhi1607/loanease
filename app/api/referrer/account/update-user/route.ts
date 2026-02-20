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

    // Get user role
    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a referrer
    if (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { first_name, surname, phone, email, password } = body;

    // Update user profile in users collection
    const updateData: Record<string, any> = {};
    if (first_name) updateData.first_name = first_name;
    if (surname) updateData.surname = surname;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length > 0) {
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: user.userId as any },
        { $set: updateData }
      );
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await hashPassword(password);
      await db.collection(COLLECTIONS.AUTH_USERS).updateOne(
        { _id: user.userId as any },
        { $set: { password_hash: hashedPassword } }
      );
    }

    // Log the update in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'users',
      record_id: user.userId,
      action: 'update',
      changes: updateData,
      created_at: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
