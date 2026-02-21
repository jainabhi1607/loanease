import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { findUserByEmail } from '@/lib/mongodb/repositories/users';
import { createPasswordResetToken } from '@/lib/mongodb/repositories/auth';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { sendPasswordResetEmail } from '@/lib/email/postmark';
import { getPasswordResetExpiryHours } from '@/lib/mongodb/repositories/global-settings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await findUserByEmail(email.toLowerCase().trim());

    // Always return success to prevent email enumeration attacks
    // But only send email if user actually exists
    if (user) {
      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiryHours = await getPasswordResetExpiryHours();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      // Store token in database
      await createPasswordResetToken({
        _id: uuidv4() as any,
        user_id: user._id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

      // Build the reset URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetLink = `${appUrl}/reset-password/confirm?token=${resetToken}`;

      // EMAIL DISABLED: Email sending is disabled until a new email service provider is configured.
      // try {
      //   const emailResult = await sendPasswordResetEmail({
      //     to: email.toLowerCase().trim(),
      //     userName: user.first_name || 'User',
      //     resetLink: resetLink,
      //   });
      //   console.log('Password reset email result:', emailResult);
      // } catch (emailError) {
      //   console.error('Error sending reset email:', emailError);
      // }
      console.log(`[EMAIL DISABLED] Password reset email for ${email.toLowerCase().trim()}`);

      // Log the password reset request
      await createAuditLog({
        user_id: user._id,
        table_name: 'users',
        record_id: user._id,
        action: 'password_reset_requested',
        field_name: 'password',
        old_value: null,
        new_value: email.toLowerCase().trim(),
        description: 'Password reset requested',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in password reset request:', error);
    // Return generic success to prevent information leakage
    return NextResponse.json({ success: true });
  }
}
