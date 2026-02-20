import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/mongodb/repositories/users';
import { getBlockedEmailDomains } from '@/lib/mongodb/repositories/global-settings';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
          available: false,
          message: 'Please enter a valid email address'
        },
        { status: 400 }
      );
    }

    // Check for disposable email domains
    const blockedDomains = await getBlockedEmailDomains();

    const domain = email.split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(domain)) {
      return NextResponse.json({
        available: false,
        message: 'Disposable email addresses are not allowed',
        isDisposable: true
      });
    }

    // Check if email already exists in our database
    const user = await findUserByEmail(email.toLowerCase());

    if (user && !user.deleted_at) {
      return NextResponse.json({
        available: false,
        exists: true,
        message: 'This email is already registered',
        suggestion: 'Please sign in or use a different email'
      });
    }

    // Email is available
    return NextResponse.json({
      available: true,
      message: 'Email is available',
      valid: true
    });

  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    );
  }
}
