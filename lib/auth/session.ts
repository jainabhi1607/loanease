import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, generateTokenPair, JWTPayload } from './jwt';
import { getDatabase } from '@/lib/mongodb/client';

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'cf_access_token';
export const REFRESH_TOKEN_COOKIE = 'cf_refresh_token';
export const TWO_FA_VERIFIED_COOKIE = 'cf_2fa_verified';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Set auth cookies after successful login
 */
export async function setAuthCookies(payload: JWTPayload): Promise<void> {
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = await generateTokenPair(payload);

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear auth cookies on logout
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(TWO_FA_VERIFIED_COOKIE);
}

/**
 * Set 2FA verified cookie
 */
export async function set2FAVerifiedCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(TWO_FA_VERIFIED_COOKIE, userId, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days - match refresh token duration
  });
}

/**
 * Check if 2FA is verified
 */
export async function is2FAVerified(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const verified = cookieStore.get(TWO_FA_VERIFIED_COOKIE);
  return verified?.value === userId;
}

/**
 * Get the current authenticated user from cookies
 * Returns null if not authenticated or token is invalid
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    // Try to refresh using refresh token
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) return null;

    const refreshPayload = await verifyRefreshToken(refreshToken);
    if (!refreshPayload) return null;

    // Generate new tokens and set cookies
    await setAuthCookies(refreshPayload);
    return refreshPayload;
  }

  return verifyAccessToken(accessToken);
}

/**
 * Get the current user from request (for API routes)
 * Supports both cookies (web) and Bearer tokens (mobile)
 */
export async function getCurrentUserFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  // First check Authorization header for Bearer token (mobile app)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await verifyAccessToken(token);
    if (user) return user;
  }

  // Fall back to cookies (web app)
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (user) return user;
  }

  // Access token missing or expired - try refresh token
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  return verifyRefreshToken(refreshToken);
}

/**
 * Verify authentication and return user, or throw error
 */
export async function verifyAuth(request: NextRequest): Promise<JWTPayload> {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(user: JWTPayload, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Check if user is admin (super_admin or admin_team)
 */
export function isAdmin(user: JWTPayload): boolean {
  return hasRole(user, ['super_admin', 'admin_team']);
}

/**
 * Check if user is referrer (referrer_admin or referrer_team)
 */
export function isReferrer(user: JWTPayload): boolean {
  return hasRole(user, ['referrer_admin', 'referrer_team']);
}

/**
 * Get full user data from database
 */
export async function getFullUserData(userId: string) {
  const db = await getDatabase();
  const user = await db.collection('users').findOne({ _id: userId as any });
  return user;
}
