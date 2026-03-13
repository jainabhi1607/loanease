import { NextResponse, NextRequest } from 'next/server';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { deleteUserSession } from '@/lib/mongodb/repositories/auth';
import { verifyRefreshToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Invalidate refresh token session in database
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (refreshToken) {
      try {
        const payload = await verifyRefreshToken(refreshToken);
        if (payload) {
          await deleteUserSession(refreshToken);
        }
      } catch {
        // Token may be invalid/expired — still proceed with logout
      }
    }

    // Clear all auth cookies
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even on error
    try { await clearAuthCookies(); } catch {}
    return NextResponse.json({ success: true });
  }
}
