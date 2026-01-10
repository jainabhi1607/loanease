import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'loanease-jwt-secret-change-in-production-2024'
);

// Cookie names
const ACCESS_TOKEN_COOKIE = 'cf_access_token';
const TWO_FA_VERIFIED_COOKIE = 'cf_2fa_verified';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organisationId: string | null;
  twoFaEnabled?: boolean;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = request.nextUrl.clone();

  // Get the access token from cookies
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const user = accessToken ? await verifyToken(accessToken) : null;

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
    return NextResponse.redirect(url);
  }

  // If user is logged in and accessing protected routes, check role-based access
  if (user && isProtectedPath) {
    const userRole = user.role;

    // Check 2FA requirement
    if (user.twoFaEnabled) {
      // Check if the cookie value matches the current user ID
      const cookieUserId = has2FAVerified?.value;
      if (cookieUserId !== user.userId && !isVerifying2FA) {
        url.pathname = '/login/verify-2fa';
        url.searchParams.set('email', user.email || '');
        return NextResponse.redirect(url);
      }
    }

    console.log('Middleware: User role:', userRole, 'Path:', url.pathname);

    // Admin routes - only super_admin and admin_team can access
    if (url.pathname.startsWith('/admin')) {
      if (userRole !== 'super_admin' && userRole !== 'admin_team') {
        // Redirect non-admins to regular dashboard
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    // Dashboard route - redirect based on role
    if (url.pathname === '/dashboard') {
      console.log('Checking dashboard redirect for role:', userRole);
      if (userRole === 'super_admin' || userRole === 'admin_team') {
        console.log('Redirecting admin to /admin/dashboard');
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      } else if (userRole === 'referrer_admin' || userRole === 'referrer_team') {
        console.log('Redirecting referrer to /referrer/dashboard');
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

  // Redirect to dashboard if accessing auth routes while logged in
  // But allow access to 2FA verification page and reset-password confirm
  if (isAuthPath && user && !url.pathname.startsWith('/reset-password/confirm')) {
    // If user has 2FA enabled but hasn't verified it, let them stay on auth pages
    if (user.twoFaEnabled) {
      const cookieUserId = has2FAVerified?.value;
      if (cookieUserId !== user.userId) {
        // User has an active session but hasn't verified 2FA
        // Clear auth cookies and let them log in fresh
        const clearResponse = NextResponse.next({ request });
        clearResponse.cookies.delete(ACCESS_TOKEN_COOKIE);
        clearResponse.cookies.delete('cf_refresh_token');
        return clearResponse;
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
