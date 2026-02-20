import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { hashPassword } from '@/lib/auth/password';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as per Next.js 15 requirements
    const { id: userId } = await params;

    // First check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden - Only admins can update users' }, { status: 403 });
    }

    const db = await getDatabase();

    // Parse request body
    const body = await request.json();
    const { password, role, first_name, surname, phone, status } = body;

    // Validate role if provided
    if (role && !['super_admin', 'admin_team', 'referrer_admin', 'referrer_team'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};

    // Update password if provided
    if (password) {
      if (password.length < 10) {
        return NextResponse.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);
      updateData.password_hash = hashedPassword;
    }

    // Update user profile fields if provided
    if (role !== undefined) updateData.role = role;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (surname !== undefined) updateData.surname = surname;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length > 0) {
      const result = await db.collection('users').updateOne(
        { _id: userId as any },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (result.modifiedCount === 0) {
        console.log('No fields were modified for user:', userId);
      }
    }

    // Log the update in audit_logs
    await db.collection('audit_logs').insertOne({
      user_id: user.userId,
      table_name: 'users',
      record_id: userId,
      action: 'update',
      changes: {
        password_updated: !!password,
        ...Object.fromEntries(
          Object.entries(updateData).filter(([key]) => key !== 'password_hash')
        )
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
