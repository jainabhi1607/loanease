import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { verifyPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required to confirm deletion' }, { status: 400 });
    }

    const db = await getDatabase();

    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['referrer_admin', 'referrer_team'].includes(userData.role)) {
      return NextResponse.json({ error: 'Only referrer accounts can self-delete via this endpoint' }, { status: 403 });
    }

    const authUser = await db.collection(COLLECTIONS.AUTH_USERS).findOne({ _id: user.userId as any });
    if (!authUser?.password_hash) {
      return NextResponse.json({ error: 'Account credentials not found' }, { status: 400 });
    }

    const passwordValid = await verifyPassword(password, authUser.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const organisationId = userData.organisation_id;
    const userEmail = userData.email;
    const userName = `${userData.first_name || ''} ${userData.surname || ''}`.trim();

    let organisationDeactivated = false;

    if (userData.role === 'referrer_admin' && organisationId) {
      const remainingAdmins = await db.collection(COLLECTIONS.USERS).countDocuments({
        organisation_id: organisationId,
        role: 'referrer_admin',
        _id: { $ne: user.userId as any },
        deleted_at: null,
      });

      if (remainingAdmins === 0) {
        await db.collection(COLLECTIONS.ORGANISATIONS).updateOne(
          { _id: organisationId as any },
          { $set: { is_active: false, deleted_at: new Date() } }
        );
        organisationDeactivated = true;
      }
    }

    await db.collection(COLLECTIONS.AUTH_USERS).deleteOne({ _id: user.userId as any });
    await db.collection('user_sessions').deleteMany({ user_id: user.userId });
    await db.collection('two_fa_codes').deleteMany({ user_id: user.userId });
    await db.collection('email_verification_tokens').deleteMany({ user_id: user.userId });
    await db.collection('password_reset_tokens').deleteMany({ user_id: user.userId });

    const anonymizedEmail = `deleted-${user.userId}@deleted.local`;
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: user.userId as any },
      {
        $set: {
          deleted_at: new Date(),
          email: anonymizedEmail,
          first_name: 'Deleted',
          surname: 'User',
          phone: null,
          mobile: null,
          state: null,
          is_active: false,
        },
      }
    );

    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      user_id: user.userId,
      table_name: 'users',
      action: 'self_delete',
      changes: {
        deleted_user_id: user.userId,
        deleted_user_email: userEmail,
        deleted_user_name: userName,
        organisation_deactivated: organisationDeactivated,
      },
      created_at: new Date(),
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      organisationDeactivated,
    });

    const cookiesToClear = ['cf_access_token', 'cf_refresh_token', 'cf_2fa_verified', 'cf_remember_me'];
    cookiesToClear.forEach(name => {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    });

    return response;

  } catch (error) {
    console.error('Error in self-delete account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
