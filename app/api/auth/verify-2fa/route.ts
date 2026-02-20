import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verify2FACode, deleteUsed2FACodes } from '@/lib/mongodb/repositories/auth';
import { findUserById } from '@/lib/mongodb/repositories/users';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { set2FAVerifiedCookie } from '@/lib/auth/session';
import { getMaxLoginAttempts, getLockoutDurationMinutes } from '@/lib/mongodb/repositories/global-settings';

// In-memory rate limiting (consider Redis for production)
const attemptStore = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of attemptStore.entries()) {
    if (now - value.firstAttempt > 3600000) { // 1 hour
      attemptStore.delete(key);
    }
  }
}, 3600000);

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    const { code, email, userId } = await request.json();

    if (!code || !email) {
      return NextResponse.json(
        { error: 'Code and email are required' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const attemptKey = `${email}-${ip}`;
    const attempts = attemptStore.get(attemptKey);
    const now = Date.now();

    if (attempts) {
      // Check if account is locked
      if (attempts.lockedUntil && attempts.lockedUntil > now) {
        const minutesLeft = Math.ceil((attempts.lockedUntil - now) / 60000);
        return NextResponse.json(
          { error: `Too many failed attempts. Please try again in ${minutesLeft} minutes.` },
          { status: 429 }
        );
      }

      // Reset attempts if window expired (15 minutes)
      if (now - attempts.firstAttempt > 900000) {
        attemptStore.delete(attemptKey);
      }
    }

    // Fetch security settings from DB
    const maxAttempts = await getMaxLoginAttempts();
    const lockoutMinutes = await getLockoutDurationMinutes();
    const lockoutMs = lockoutMinutes * 60 * 1000;

    // Verify the 2FA code
    const codeData = await verify2FACode(code);

    if (!codeData) {
      // Log failed attempt
      const currentAttempts = attemptStore.get(attemptKey) || { count: 0, firstAttempt: now };
      currentAttempts.count++;

      // Lock account after max failed attempts
      if (currentAttempts.count >= maxAttempts) {
        currentAttempts.lockedUntil = now + lockoutMs;
        attemptStore.set(attemptKey, currentAttempts);

        // Log security event
        await createAuditLog({
          user_id: userId || null,
          table_name: 'two_fa_codes',
          record_id: '',
          action: 'locked',
          field_name: '2fa_verification',
          old_value: null,
          new_value: `Account locked after ${currentAttempts.count} failed attempts`,
          description: 'Account locked due to too many failed 2FA attempts',
          ip_address: ip,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        });

        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.` },
          { status: 429 }
        );
      }

      attemptStore.set(attemptKey, currentAttempts);

      // Log failed attempt
      await createAuditLog({
        user_id: userId || null,
        table_name: 'two_fa_codes',
        record_id: '',
        action: 'failed_verification',
        field_name: '2fa_code',
        old_value: null,
        new_value: `Failed attempt ${currentAttempts.count}/${maxAttempts}`,
        description: 'Failed 2FA verification attempt',
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });

      return NextResponse.json(
        {
          error: 'Invalid or expired code. Please try again.',
          attemptsLeft: maxAttempts - currentAttempts.count
        },
        { status: 400 }
      );
    }

    // Delete the used code and clean up expired codes
    await deleteUsed2FACodes(codeData.user_id);

    // Clear failed attempts on success
    attemptStore.delete(attemptKey);

    // Set 2FA verified cookie
    await set2FAVerifiedCookie(codeData.user_id);

    // Log successful verification
    await createAuditLog({
      user_id: codeData.user_id,
      table_name: 'two_fa_codes',
      record_id: codeData.user_id,
      action: 'verified',
      field_name: '2fa_verification',
      old_value: null,
      new_value: 'Successfully verified',
      description: '2FA code verified successfully',
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });

    // Get user profile for response
    const user = await findUserById(codeData.user_id);

    return NextResponse.json({
      success: true,
      userId: codeData.user_id,
      role: user?.role
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
