import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { findUserById } from '@/lib/mongodb/repositories/users';

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const jwtUser = await getCurrentUserFromRequest(request);

    if (!jwtUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get full user profile from database
    const user = await findUserById(jwtUser.userId);

    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        surname: user.surname,
        role: user.role,
        organisation_id: user.organisation_id,
        two_fa_enabled: user.two_fa_enabled,
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
