import { NextRequest, NextResponse } from 'next/server';
import { createTwoFACode } from '@/lib/mongodb/repositories/auth';
import { findUserById } from '@/lib/mongodb/repositories/users';
import { send2FACode } from '@/lib/email/postmark';

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Get user profile for name
    const user = await findUserById(userId);

    // Create 2FA code in database
    const twoFACode = await createTwoFACode(userId);

    // Send email with code
    const emailResult = await send2FACode(
      email,
      twoFACode.code,
      user?.first_name
    );

    if (!emailResult.success) {
      console.error('Error sending 2FA email');
      // Still return success - code is in database even if email fails
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
