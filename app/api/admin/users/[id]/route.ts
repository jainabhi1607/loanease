import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Only Super Admins can access user details' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch user details
    const targetUser = await db.collection('users').findOne(
      { _id: userId as any },
      {
        projection: {
          _id: 1,
          email: 1,
          first_name: 1,
          surname: 1,
          phone: 1,
          role: 1,
          status: 1,
          two_fa_enabled: 1,
          created_at: 1,
          last_login_at: 1
        }
      }
    );

    if (!targetUser) {
      console.error('User not found with ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format the response
    const formattedUser = {
      id: targetUser._id,
      email: targetUser.email,
      firstName: targetUser.first_name || '',
      lastName: targetUser.surname || '',
      mobile: targetUser.phone || '',
      phone: targetUser.phone || '',
      role: targetUser.role,
      roleDisplay: targetUser.role === 'super_admin' ? 'Super Admin' : 'Administrator',
      twoFactorEnabled: targetUser.two_fa_enabled,
      status: targetUser.status || 'active',
      createdAt: targetUser.created_at,
      lastLoginAt: targetUser.last_login_at,
    };

    return NextResponse.json({ user: formattedUser });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is authenticated and is a super admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admins can remove administrator access' }, { status: 403 });
    }

    const db = await getDatabase();

    // Check the user exists and is an admin
    const targetUser = await db.collection('users').findOne(
      { _id: userId as any },
      { projection: { role: 1, email: 1 } }
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot remove Super Admin access' }, { status: 403 });
    }

    if (targetUser.role !== 'admin_team') {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 400 });
    }

    // Update user role to remove admin access
    const result = await db.collection('users').updateOne(
      { _id: userId as any },
      {
        $set: {
          role: 'referrer_admin', // Downgrade to regular referrer admin
          updated_at: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount === 0) {
      console.error('Error removing admin access: no document modified');
      return NextResponse.json({ error: 'Failed to remove admin access' }, { status: 500 });
    }

    // Log the action
    await db.collection('audit_logs').insertOne({
      user_id: user.userId,
      table_name: 'users',
      record_id: userId,
      action: 'update',
      field_name: 'role',
      old_value: 'admin_team',
      new_value: 'referrer_admin',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Admin access removed successfully'
    });

  } catch (error) {
    console.error('Error in delete admin API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
