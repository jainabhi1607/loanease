import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { findUserByEmail } from '@/lib/mongodb/repositories/users';
import { findOrganisationById } from '@/lib/mongodb/repositories/organisations';
import {
  findLatestEmailVerificationToken,
  invalidateEmailVerificationTokens,
  createEmailVerificationToken
} from '@/lib/mongodb/repositories/auth';
import { sendVerificationEmail } from '@/lib/email/postmark';

// Rate limiting for resend attempts
const resendAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limiting - max 3 resends per hour
    const attemptKey = `resend-${email}`;
    const now = Date.now();
    const attempts = resendAttempts.get(attemptKey);

    if (attempts) {
      // Reset if an hour has passed
      if (now - attempts.lastAttempt > 3600000) {
        resendAttempts.delete(attemptKey);
      } else if (attempts.count >= 3) {
        const minutesLeft = Math.ceil((3600000 - (now - attempts.lastAttempt)) / 60000);
        return NextResponse.json(
          { error: `Too many resend attempts. Please try again in ${minutesLeft} minutes.` },
          { status: 429 }
        );
      }
    }

    // Find the user by email
    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true });
    }

    // Check if email is already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified. Please login.' },
        { status: 400 }
      );
    }

    // Get organisation name
    let orgName = '';
    if (user.organisation_id) {
      const org = await findOrganisationById(user.organisation_id);
      orgName = org?.company_name || '';
    }

    // Get existing token's signup_data before invalidating
    const existingToken = await findLatestEmailVerificationToken(user._id);

    // Invalidate any existing tokens
    await invalidateEmailVerificationTokens(user._id);

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Store new verification token (preserve signup_data from previous token)
    await createEmailVerificationToken({
      _id: uuidv4() as any,
      user_id: user._id,
      token: verificationToken,
      expires_at: expiresAt.toISOString(),
      signup_data: existingToken?.signup_data || null,
      created_at: new Date().toISOString()
    });

    // Send verification email
    try {
      await sendVerificationEmail(
        email,
        user.first_name || 'User',
        verificationToken,
        orgName
      );
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    // Update rate limiting
    const currentAttempts = resendAttempts.get(attemptKey) || { count: 0, lastAttempt: now };
    currentAttempts.count++;
    currentAttempts.lastAttempt = now;
    resendAttempts.set(attemptKey, currentAttempts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
