import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { getTwoFACodeExpiryMinutes } from '@/lib/mongodb/repositories/global-settings';

// Hardcoded OTP for testing - will implement SMS/Email later
const HARDCODED_OTP = '998877';

// Input validation schema
const requestOTPSchema = z.object({
  mobile: z.string().min(10, 'Invalid mobile number'),
  device_id: z.string().optional(),
});

// Helper to normalize mobile number to +91 (India) format
function normalizeMobile(mobile: string): string {
  // Remove all non-digit characters except +
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

// Helper to mask mobile number
function maskMobile(mobile: string): string {
  if (mobile.length < 4) return '****';
  return '****' + mobile.slice(-4);
}

// Helper to mask email
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '****@****.***';
  const maskedLocal = localPart[0] + '***';
  return `${maskedLocal}@${domain}`;
}

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    // Parse and validate input
    const body = await request.json();
    const validatedData = requestOTPSchema.parse(body);

    // Normalize mobile number
    const mobile = normalizeMobile(validatedData.mobile);
    const deviceId = validatedData.device_id || 'unknown';

    const db = await getDatabase();

    // Find user by mobile number
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      $or: [
        { mobile: mobile },
        { phone: mobile },
        { mobile: validatedData.mobile },
        { phone: validatedData.mobile },
      ],
      is_active: true,
    });

    if (!user) {
      // Log failed attempt
      await createAuditLog({
        table_name: 'auth',
        record_id: '',
        action: 'mobile_otp_request_failed',
        field_name: 'mobile',
        old_value: null,
        new_value: maskMobile(mobile),
        description: 'OTP request failed - mobile not found',
        user_id: null,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this mobile number. Please check the number or contact support.'
        },
        { status: 404 }
      );
    }

    // Check rate limiting - max 5 OTP requests per hour per mobile
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await db.collection(COLLECTIONS.MOBILE_OTP_CODES).countDocuments({
      mobile: mobile,
      created_at: { $gte: oneHourAgo },
    });

    if (recentOTPs >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many OTP requests. Please try again in an hour.'
        },
        { status: 429 }
      );
    }

    // Create OTP record
    const otpId = uuidv4();
    const otpExpiryMinutes = await getTwoFACodeExpiryMinutes();
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

    await db.collection(COLLECTIONS.MOBILE_OTP_CODES).insertOne({
      _id: otpId as any,
      user_id: user._id,
      mobile: mobile,
      email: user.email,
      otp: HARDCODED_OTP, // Hardcoded OTP for testing
      otp_id: otpId,
      attempts: 0,
      max_attempts: 3,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date(),
      device_id: deviceId,
      ip_address: ip,
    });

    // Log OTP request
    const userId = user._id.toString();
    await createAuditLog({
      table_name: 'auth',
      record_id: userId,
      action: 'mobile_otp_requested',
      field_name: 'mobile',
      old_value: null,
      new_value: maskMobile(mobile),
      description: 'OTP requested for mobile login',
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    // TODO: Send OTP via SMS and Email
    // For now, OTP is hardcoded as 998877
    console.log(`[DEV] OTP for ${maskMobile(mobile)}: ${HARDCODED_OTP}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your mobile and email',
      otp_id: otpId,
      expires_in: otpExpiryMinutes * 60, // seconds
      masked_email: maskEmail(user.email),
      masked_mobile: maskMobile(mobile),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Request OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
