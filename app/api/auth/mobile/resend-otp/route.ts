import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

// Hardcoded OTP for testing - will implement SMS/Email later
const HARDCODED_OTP = '998877';
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

// Input validation schema
const resendOTPSchema = z.object({
  mobile: z.string().min(10, 'Invalid mobile number'),
  otp_id: z.string().uuid('Invalid OTP ID'),
  device_id: z.string().optional(),
});

// Helper to normalize mobile number
function normalizeMobile(mobile: string): string {
  let normalized = mobile.replace(/[^\d+]/g, '');

  if (normalized.startsWith('04')) {
    normalized = '+61' + normalized.slice(1);
  } else if (normalized.startsWith('4') && normalized.length === 9) {
    normalized = '+61' + normalized;
  } else if (!normalized.startsWith('+61')) {
    if (normalized.startsWith('61')) {
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
    const validatedData = resendOTPSchema.parse(body);

    const mobile = normalizeMobile(validatedData.mobile);
    const { otp_id, device_id } = validatedData;

    const db = await getDatabase();

    // Find the original OTP record
    const originalOTP = await db.collection(COLLECTIONS.MOBILE_OTP_CODES).findOne({
      otp_id: otp_id,
      mobile: mobile,
    });

    if (!originalOTP) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP session. Please start a new login.'
        },
        { status: 400 }
      );
    }

    // Check cooldown - prevent resend within 60 seconds
    const timeSinceCreated = Date.now() - new Date(originalOTP.created_at).getTime();
    if (timeSinceCreated < RESEND_COOLDOWN_SECONDS * 1000) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - timeSinceCreated) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          wait_seconds: waitSeconds,
        },
        { status: 429 }
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

    // Invalidate the old OTP
    await db.collection(COLLECTIONS.MOBILE_OTP_CODES).updateOne(
      { _id: originalOTP._id },
      { $set: { verified_at: new Date(), invalidated: true } }
    );

    // Create new OTP record
    const newOtpId = uuidv4();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.collection(COLLECTIONS.MOBILE_OTP_CODES).insertOne({
      _id: newOtpId as any,
      user_id: originalOTP.user_id,
      mobile: mobile,
      email: originalOTP.email,
      otp: HARDCODED_OTP, // Hardcoded OTP for testing
      otp_id: newOtpId,
      attempts: 0,
      max_attempts: 3,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date(),
      device_id: device_id || originalOTP.device_id,
      ip_address: ip,
      resent_from: otp_id,
    });

    // Log OTP resend
    await createAuditLog({
      table_name: 'auth',
      record_id: originalOTP.user_id,
      action: 'mobile_otp_resent',
      field_name: 'mobile',
      old_value: otp_id,
      new_value: newOtpId,
      description: 'OTP resent for mobile login',
      user_id: originalOTP.user_id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    // TODO: Send OTP via SMS and Email
    // For now, OTP is hardcoded as 998877
    console.log(`[DEV] Resent OTP for ${maskMobile(mobile)}: ${HARDCODED_OTP}`);

    return NextResponse.json({
      success: true,
      message: 'New OTP sent to your mobile and email',
      otp_id: newOtpId,
      expires_in: OTP_EXPIRY_MINUTES * 60, // seconds
      masked_email: maskEmail(originalOTP.email),
      masked_mobile: maskMobile(mobile),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
