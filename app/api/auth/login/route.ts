import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { verifyPassword } from '@/lib/auth/password';
import { setAuthCookies } from '@/lib/auth/session';
import { JWTPayload, generateTokenPair } from '@/lib/auth/jwt';
import { findUserByEmail, updateLastLogin } from '@/lib/mongodb/repositories/users';
import { logSuccessfulLogin, logFailedLogin, logBlockedLogin } from '@/lib/mongodb/repositories/login-history';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';
import { createTwoFACode } from '@/lib/mongodb/repositories/auth';
import { send2FACode } from '@/lib/email/postmark';

// Rate limiting store (consider Redis for production)
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.firstAttempt > 3600000) { // 1 hour
      loginAttempts.delete(key);
    }
  }
}, 3600000);

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  mobile_app: z.boolean().optional(), // Flag for mobile app to get tokens in response
});

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  try {
    // Parse and validate input
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

    // Rate limiting check
    const attemptKey = `${email}-${ip}`;
    const attempts = loginAttempts.get(attemptKey);
    const now = Date.now();

    if (attempts) {
      // Check if account is locked
      if (attempts.lockedUntil && attempts.lockedUntil > now) {
        const minutesLeft = Math.ceil((attempts.lockedUntil - now) / 60000);

        // Log blocked attempt
        await createAuditLog({
          table_name: 'auth',
          record_id: '',
          action: 'login_blocked',
          field_name: 'email',
          old_value: `Blocked for ${minutesLeft} more minutes`,
          new_value: email,
          description: 'Login blocked due to too many attempts',
          user_id: null,
          ip_address: ip,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        });

        await logBlockedLogin(email, ip, userAgent);

        return NextResponse.json(
          { error: `Too many failed attempts. Please try again in ${minutesLeft} minutes.` },
          { status: 429 }
        );
      }

      // Reset attempts if window expired (15 minutes)
      if (now - attempts.firstAttempt > 900000) {
        loginAttempts.delete(attemptKey);
      }
    }

    // Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
      // Track failed attempt
      const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, firstAttempt: now };
      currentAttempts.count++;
      loginAttempts.set(attemptKey, currentAttempts);

      await logFailedLogin(email, ip, userAgent, `User not found. Attempt ${currentAttempts.count}/5`);

      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsLeft: 5 - currentAttempts.count
        },
        { status: 401 }
      );
    }

    // Check if user has a password hash
    if (!user.password_hash) {
      // User needs to reset password (migrated from Supabase)
      return NextResponse.json(
        {
          error: 'Please reset your password to continue. Your account was migrated and requires a new password.',
          requiresPasswordReset: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Track failed attempt
      const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, firstAttempt: now };
      currentAttempts.count++;

      // Lock after 5 failed attempts for 30 minutes
      if (currentAttempts.count >= 5) {
        currentAttempts.lockedUntil = now + 1800000; // 30 minutes
        loginAttempts.set(attemptKey, currentAttempts);

        await createAuditLog({
          table_name: 'auth',
          record_id: user._id,
          action: 'login_locked',
          field_name: 'email',
          old_value: `Locked after ${currentAttempts.count} failed attempts`,
          new_value: email,
          description: 'Account locked due to failed attempts',
          user_id: user._id,
          ip_address: ip,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        });

        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked for 30 minutes.' },
          { status: 429 }
        );
      }

      loginAttempts.set(attemptKey, currentAttempts);
      await logFailedLogin(email, ip, userAgent, `Invalid credentials. Attempt ${currentAttempts.count}/5`);

      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsLeft: 5 - currentAttempts.count
        },
        { status: 401 }
      );
    }

    // Check if user account is inactive
    if (user.status === 'inactive' || !user.is_active) {
      await createAuditLog({
        table_name: 'auth',
        record_id: user._id,
        action: 'login_blocked',
        field_name: 'status',
        old_value: 'Login attempt by inactive user',
        new_value: 'inactive',
        description: 'Login blocked - inactive account',
        user_id: user._id,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });

      await logBlockedLogin(email, ip, userAgent);

      return NextResponse.json(
        { error: 'Your account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Clear failed attempts on success
    loginAttempts.delete(attemptKey);

    // Log successful login
    await logSuccessfulLogin(user._id, email, ip, userAgent);
    await updateLastLogin(user._id, ip);

    await createAuditLog({
      table_name: 'auth',
      record_id: user._id,
      action: 'login_success',
      field_name: 'email',
      old_value: null,
      new_value: email,
      description: 'User logged in successfully',
      user_id: user._id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });

    // Send 2FA if enabled
    if (user.two_fa_enabled) {
      try {
        const twoFACode = await createTwoFACode(user._id);
        await send2FACode(user.email, twoFACode.code, user.first_name);
      } catch (error) {
        console.error('Error sending 2FA code:', error);
      }
    }

    // Create JWT payload
    const jwtPayload: JWTPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      organisationId: user.organisation_id,
      twoFaEnabled: user.two_fa_enabled
    };

    // Set auth cookies (for web)
    await setAuthCookies(jwtPayload);

    // Generate tokens for mobile app
    const isMobileApp = validatedData.mobile_app === true;
    let tokens = null;
    if (isMobileApp) {
      tokens = await generateTokenPair(jwtPayload);
    }

    const responseData: Record<string, unknown> = {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAEnabled: user.two_fa_enabled,
        first_name: user.first_name,
        surname: user.surname,
        organisation_id: user.organisation_id,
      }
    };

    // Include tokens for mobile app
    if (tokens) {
      responseData.access_token = tokens.accessToken;
      responseData.refresh_token = tokens.refreshToken;
    }

    return NextResponse.json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
