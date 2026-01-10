import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { findUserByEmail } from '@/lib/mongodb/repositories/users';
import { createTwoFACode, invalidateExisting2FACodes } from '@/lib/mongodb/repositories/auth';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

// Rate limiting for resend requests
const resendAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of resendAttempts.entries()) {
    if (now - value.lastAttempt > 3600000) { // 1 hour
      resendAttempts.delete(key);
    }
  }
}, 3600000);

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limiting check - max 3 resends per hour
    const attemptKey = `resend-${email}-${ip}`;
    const attempts = resendAttempts.get(attemptKey);
    const now = Date.now();

    if (attempts) {
      // Check if too many resend attempts
      if (attempts.count >= 3 && (now - attempts.lastAttempt) < 3600000) {
        return NextResponse.json(
          { error: 'Too many resend attempts. Please try again later.' },
          { status: 429 }
        );
      }

      // Reset if hour has passed
      if (now - attempts.lastAttempt >= 3600000) {
        resendAttempts.delete(attemptKey);
      }
    }

    // Get user by email
    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not
      return NextResponse.json({ success: true });
    }

    // Check if user has 2FA enabled
    if (!user.two_fa_enabled) {
      return NextResponse.json({ success: true });
    }

    // Invalidate any existing unused codes
    await invalidateExisting2FACodes(user._id);

    // Create new 2FA code
    const twoFACode = await createTwoFACode(user._id);

    // Send email with Postmark using proper template variables
    try {
      const response = await fetch('https://api.postmarkapp.com/email/withTemplate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY!,
        },
        body: JSON.stringify({
          From: process.env.POSTMARK_FROM_EMAIL || 'noreply@loanease.com',
          To: email,
          TemplateAlias: 'twofactor-code',
          TemplateModel: {
            first_name: user.first_name || 'User',
            verification_code: twoFACode.code,
            code_expiry_minutes: '10',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Postmark error:', errorData);
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    // Update resend attempts
    const currentAttempts = resendAttempts.get(attemptKey) || { count: 0, lastAttempt: now };
    currentAttempts.count++;
    currentAttempts.lastAttempt = now;
    resendAttempts.set(attemptKey, currentAttempts);

    // Log the resend
    await createAuditLog({
      user_id: user._id,
      table_name: 'two_fa_codes',
      record_id: user._id,
      action: 'resend',
      field_name: '2fa_code',
      old_value: null,
      new_value: 'Code resent',
      description: '2FA code resent',
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      attemptsLeft: 3 - currentAttempts.count
    });

  } catch (error) {
    console.error('Resend 2FA error:', error);
    return NextResponse.json(
      { error: 'Failed to resend code' },
      { status: 500 }
    );
  }
}
