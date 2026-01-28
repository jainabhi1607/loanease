import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRefreshToken, generateTokenPair, JWTPayload } from '@/lib/auth/jwt';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

// Input validation schema
const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json();
    const validatedData = refreshSchema.parse(body);

    // Verify the refresh token
    const payload = await verifyRefreshToken(validatedData.refresh_token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check if user still exists and is active
    const db = await getDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: payload.userId as any,
      is_active: true,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new token pair
    const newPayload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organisationId: user.organisation_id,
      twoFaEnabled: user.two_fa_enabled,
    };

    const tokens = await generateTokenPair(newPayload);

    return NextResponse.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Refresh token error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
