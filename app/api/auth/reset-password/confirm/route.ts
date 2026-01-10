import { NextResponse } from 'next/server';
import { verifyPasswordResetToken, markPasswordResetTokenUsed } from '@/lib/mongodb/repositories/auth';
import { updateUser } from '@/lib/mongodb/repositories/users';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Verify the reset token
    const tokenData = await verifyPasswordResetToken(token);

    if (!tokenData) {
      return NextResponse.json({
        error: 'Invalid or expired reset token. Please request a new password reset link.'
      }, { status: 400 });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        error: 'Reset token has expired. Please request a new password reset link.'
      }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update the user's password
    await updateUser(tokenData.user_id, { password_hash: passwordHash });

    // Mark token as used
    await markPasswordResetTokenUsed(token);

    // Log the password reset
    await createAuditLog({
      user_id: tokenData.user_id,
      table_name: 'users',
      record_id: tokenData.user_id,
      action: 'password_reset_completed',
      field_name: 'password',
      old_value: null,
      new_value: 'Password changed',
      description: 'Password reset completed',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in password reset confirmation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
