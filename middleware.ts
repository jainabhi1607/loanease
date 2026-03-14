import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'loanease-jwt-secret-change-in-production-2024'
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'loanease-refresh-secret-change-in-production-2024'
);

// Cookie names
const ACCESS_TOKEN_COOKIE = 'cf_access_token';
const REFRESH_TOKEN_COOKIE = 'cf_refresh_token';
const TWO_FA_VERIFIED_COOKIE = 'cf_2fa_verified';
const REMEMBER_ME_COOKIE = 'cf_remember_me';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organisationId: string | null;
  twoFaEnabled?: boolean;
}

async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

async function generateAccessTokenInMiddleware(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function clearAllAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(TWO_FA_VERIFIED_COOKIE);
  response.cookies.delete(REMEMBER_ME_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = request.nextUrl.clone();

  // Get tokens from cookies
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Try access token first
  let user = accessToken ? await verifyAccessToken(accessToken) : null;

  // If access token is expired/missing, try refresh token and issue a new access token
  if (!user && refreshToken) {
    user = await verifyRefreshToken(refreshToken);
    if (user) {
      // Issue a new access token cookie on the response so subsequent requests don't repeat this path
      const newAccessToken = await generateAccessTokenInMiddleware(user);
      response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60, // 15 minutes
      });
    }
  }

  // Check if user has verified 2FA (if required)
  const has2FAVerified = request.cookies.get(TWO_FA_VERIFIED_COOKIE);
  const isVerifying2FA = url.pathname.startsWith('/login/verify-2fa');

  // Protected routes
  const protectedPaths = ['/dashboard', '/admin', '/referrer'];
  const isProtectedPath = protectedPaths.some(path =>
    url.pathname.startsWith(path)
  );

  // Auth routes
  const authPaths = ['/login', '/signup', '/register', '/reset-password'];
  const isAuthPath = authPaths.some(path =>
    url.pathname.startsWith(path)
  ) && !isVerifying2FA;

  // Public routes (accessible without authentication)
  const publicPaths = ['/pre-assessment'];
  const isPublicPath = publicPaths.some(path =>
    url.pathname.startsWith(path)
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !user) {
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    // Clear any stale cookies so user gets a clean login
    return clearAllAuthCookies(redirectResponse);
  }

  // If user is logged in and accessing protected routes, check role-based access
  if (user && isProtectedPath) {
    const userRole = user.role;

    // Determine if 2FA is required - always required for admin roles
    const requires2FA = user.twoFaEnabled ||
      userRole === 'super_admin' ||
      userRole === 'admin_team';

    // Check 2FA requirement
    if (requires2FA) {
      const cookieUserId = has2FAVerified?.value;
      if (cookieUserId !== user.userId && !isVerifying2FA) {
        // 2FA cookie is missing or doesn't match the user.
        // Always redirect to login for full re-authentication (not to verify-2fa).
        // The user must log in again to trigger a new 2FA code.
        url.pathname = '/login';
        const redirectResponse = NextResponse.redirect(url);
        return clearAllAuthCookies(redirectResponse);
      }
    }

    // Admin routes - only super_admin and admin_team can access
    if (url.pathname.startsWith('/admin')) {
      if (userRole !== 'super_admin' && userRole !== 'admin_team') {
        // Redirect non-admins to regular dashboard
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      // Super admin only pages - Users and Settings
      if (url.pathname.startsWith('/admin/users') || url.pathname.startsWith('/admin/settings')) {
        if (userRole !== 'super_admin') {
          url.pathname = '/admin/dashboard';
          return NextResponse.redirect(url);
        }
      }
    }

    // Dashboard route - redirect based on role
    if (url.pathname === '/dashboard') {
      if (userRole === 'super_admin' || userRole === 'admin_team') {
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      } else if (userRole === 'referrer_admin' || userRole === 'referrer_team') {
        url.pathname = '/referrer/dashboard';
        return NextResponse.redirect(url);
      }
      // Other roles stay at /dashboard
    }

    // Referrer routes - only referrer_admin and referrer_team can access
    if (url.pathname.startsWith('/referrer')) {
      if (userRole !== 'referrer_admin' && userRole !== 'referrer_team') {
        // Redirect non-referrers to regular dashboard
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  // Handle the verify-2fa page specifically
  if (isVerifying2FA) {
    // If no valid user session at all, redirect to login
    if (!user) {
      url.pathname = '/login';
      const redirectResponse = NextResponse.redirect(url);
      return clearAllAuthCookies(redirectResponse);
    }
    // If 2FA already verified, redirect to dashboard
    if (has2FAVerified?.value === user.userId) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Otherwise allow access to 2FA page
    return response;
  }

  // Redirect to dashboard if accessing auth routes while logged in
  // But allow access to reset-password confirm
  if (isAuthPath && user && !url.pathname.startsWith('/reset-password/confirm')) {
    // Determine if 2FA is required for this user
    const requires2FA = user.twoFaEnabled ||
      user.role === 'super_admin' ||
      user.role === 'admin_team';

    // If user has 2FA enabled but hasn't verified it, clear cookies and let them re-login
    if (requires2FA) {
      const cookieUserId = has2FAVerified?.value;
      if (cookieUserId !== user.userId) {
        const clearResponse = NextResponse.next({ request });
        return clearAllAuthCookies(clearResponse);
      }
    }

    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
