import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { setAuthCookies } from '@/lib/auth/session';
import { JWTPayload, generateTokenPair } from '@/lib/auth/jwt';
import { logSuccessfulLogin, logFailedLogin } from '@/lib/mongodb/repositories/login-history';
import { updateLastLogin } from '@/lib/mongodb/repositories/users';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

// Input validation schema
const verifyOTPSchema = z.object({
  mobile: z.string().min(10, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  otp_id: z.string().uuid('Invalid OTP ID'),
  device_id: z.string().optional(),
});

// Helper to normalize mobile number to +91 (India) format
function normalizeMobile(mobile: string): string {
  let normalized = mobile.replace(/[^\d+]/g, '');

  // Convert 0XXXXXXXXXX to +91XXXXXXXXXX (remove leading 0)
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = '+91' + normalized.slice(1);
  }
  // Convert 10-digit Indian mobile (starts with 6-9) to +91XXXXXXXXXX
  else if (/^[6-9]\d{9}$/.test(normalized)) {
    normalized = '+91' + normalized;
  }
  // Ensure +91 prefix
  else if (!normalized.startsWith('+91')) {
    if (normalized.startsWith('91') && normalized.length === 12) {
      normalized = '+' + normalized;
    }
  }

  return normalized;
}

// Helper to mask mobile
function maskMobile(mobile: string): string {
  if (mobile.length < 4) return '****';
  return '****' + mobile.slice(-4);
}

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    // Parse and validate input
    const body = await request.json();
    const validatedData = verifyOTPSchema.parse(body);

    const mobile = normalizeMobile(validatedData.mobile);
    const { otp, otp_id, device_id } = validatedData;

    const db = await getDatabase();

    // Find OTP record
    const otpRecord = await db.collection(COLLECTIONS.MOBILE_OTP_CODES).findOne({
      otp_id: otp_id,
      mobile: mobile,
      verified_at: null,
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired OTP session. Please request a new code.'
        },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await createAuditLog({
        table_name: 'auth',
        record_id: otpRecord.user_id,
        action: 'mobile_otp_expired',
        field_name: 'otp',
        old_value: null,
        new_value: maskMobile(mobile),
        description: 'OTP verification failed - expired',
        user_id: otpRecord.user_id,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'OTP has expired. Please request a new code.'
        },
        { status: 400 }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many failed attempts. Please request a new code.'
        },
        { status: 429 }
      );
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await db.collection(COLLECTIONS.MOBILE_OTP_CODES).updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } }
      );

      const attemptsRemaining = otpRecord.max_attempts - otpRecord.attempts - 1;

      await createAuditLog({
        table_name: 'auth',
        record_id: otpRecord.user_id,
        action: 'mobile_otp_failed',
        field_name: 'otp',
        old_value: `Attempt ${otpRecord.attempts + 1}/${otpRecord.max_attempts}`,
        new_value: maskMobile(mobile),
        description: 'OTP verification failed - invalid code',
        user_id: otpRecord.user_id,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      });

      await logFailedLogin(
        otpRecord.email || mobile,
        ip,
        userAgent,
        `Invalid OTP. Attempt ${otpRecord.attempts + 1}/${otpRecord.max_attempts}`
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP. Please check and try again.',
          attempts_remaining: attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // OTP is valid - mark as verified
    await db.collection(COLLECTIONS.MOBILE_OTP_CODES).updateOne(
      { _id: otpRecord._id },
      { $set: { verified_at: new Date() } }
    );

    // Get user
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: otpRecord.user_id as any,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is inactive. Please contact support.'
        },
        { status: 403 }
      );
    }

    // Log successful login
    await logSuccessfulLogin(userId, user.email, ip, userAgent);
    await updateLastLogin(userId, ip);

    await createAuditLog({
      table_name: 'auth',
      record_id: userId,
      action: 'mobile_otp_login_success',
      field_name: 'mobile',
      old_value: null,
      new_value: maskMobile(mobile),
      description: 'User logged in via mobile OTP',
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    // Register/update device if device_id provided
    if (device_id) {
      await db.collection(COLLECTIONS.MOBILE_DEVICES).updateOne(
        { device_id: device_id, user_id: userId },
        {
          $set: {
            user_id: userId,
            device_id: device_id,
            last_active_at: new Date(),
            updated_at: new Date(),
          },
          $setOnInsert: {
            _id: device_id as any,
            created_at: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Create JWT payload
    const jwtPayload: JWTPayload = {
      userId: userId,
      email: user.email,
      role: user.role,
      organisationId: user.organisation_id,
      twoFaEnabled: false, // Skip 2FA for OTP login
    };

    // Set auth cookies (for web)
    await setAuthCookies(jwtPayload);

    // Generate tokens for mobile app
    const tokens = await generateTokenPair(jwtPayload);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        surname: user.surname,
        role: user.role,
        organisation_id: user.organisation_id,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
