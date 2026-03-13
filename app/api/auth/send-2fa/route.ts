import { NextRequest, NextResponse } from 'next/server';
import { createTwoFACode } from '@/lib/mongodb/repositories/auth';
import { findUserById } from '@/lib/mongodb/repositories/users';
import { send2FACode } from '@/lib/email/postmark';
import { getCurrentUserFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent abuse
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Only allow resending 2FA for the authenticated user
    if (userId !== currentUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user profile for name
    const user = await findUserById(userId);

    // Create 2FA code in database
    const twoFACode = await createTwoFACode(userId);

    const emailResult = await send2FACode(
      email,
      twoFACode.code,
      user?.first_name
    );

    if (!emailResult.success) {
      console.error('Error sending 2FA email');
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Error in send-2fa:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
