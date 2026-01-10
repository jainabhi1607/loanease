import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken, markEmailVerificationTokenUsed } from '@/lib/mongodb/repositories/auth';
import { findUserById, updateUser } from '@/lib/mongodb/repositories/users';
import { updateOrganisation } from '@/lib/mongodb/repositories/organisations';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { sendAllSignupEmails, SignupEmailParams } from '@/lib/email/signup-emails';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find the token in database
    const tokenData = await verifyEmailToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'This verification link has already been used' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This verification link has expired' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await findUserById(tokenData.user_id);

    if (!user) {
      console.error('User not found for token');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Update user to mark email as confirmed
    await updateUser(tokenData.user_id, { email_verified: true });

    // Mark token as used
    await markEmailVerificationTokenUsed(token);

    // Log the verification
    try {
      await createAuditLog({
        user_id: tokenData.user_id,
        table_name: 'users',
        record_id: tokenData.user_id,
        action: 'update',
        field_name: 'email_verified',
        old_value: 'false',
        new_value: 'true',
        description: 'Email verified',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error('Error logging verification:', auditError);
    }

    // Send welcome, agreement, and admin alert emails after successful verification
    if (tokenData.signup_data) {
      try {
        const signupData = tokenData.signup_data as unknown as SignupEmailParams;

        // Update organisation with agreement_ip and agreement_date
        if (user.organisation_id) {
          await updateOrganisation(user.organisation_id, {
            agreement_ip: signupData.ipAddress || 'Not recorded',
            agreement_date: new Date().toISOString()
          });
        }

        await sendAllSignupEmails(signupData);
        console.log('Signup emails sent successfully after verification');
      } catch (emailError) {
        console.error('Error sending signup emails after verification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
