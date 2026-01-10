import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/session';

export async function POST() {
  try {
    // Clear all auth cookies
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true }); // Still return success even if there's an error
  }
}
