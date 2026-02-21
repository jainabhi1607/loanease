import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/lib/mongodb/client';
import { hashPassword } from '@/lib/auth/password';
import { findUserByEmail, createUser } from '@/lib/mongodb/repositories/users';
import { findOrganisationById } from '@/lib/mongodb/repositories/organisations';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

const registrationSchema = z.object({
  token: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  state: z.string().optional(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json();
    const validatedData = registrationSchema.parse(body);
    const { token, firstName, lastName, phone, state, password } = validatedData;

    const db = await getDatabase();

    // Verify invitation token
    const invitation = await db.collection('user_invitations').findOne({
      token,
      status: 'pending'
    });

    if (!invitation) {
      return NextResponse.json({
        error: 'Invalid or expired invitation'
      }, { status: 400 });
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await db.collection('user_invitations').updateOne(
        { _id: invitation._id },
        { $set: { status: 'expired' } }
      );

      return NextResponse.json({
        error: 'This invitation has expired'
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(invitation.email);
    if (existingUser) {
      return NextResponse.json({
        error: 'A user with this email already exists'
      }, { status: 400 });
    }

    // Generate user ID and hash password
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    // Get role from invitation metadata
    const invitationRole = invitation.metadata?.role || 'referrer_team';
    const force2FA = invitation.metadata?.force_2fa || false;

    // Create user
    const newUser = await createUser({
      _id: userId,
      email: invitation.email,
      password_hash: passwordHash,
      first_name: firstName,
      surname: lastName,
      phone: phone,
      state: state || null,
      organisation_id: invitation.organisation_id,
      role: invitationRole,
      two_fa_enabled: force2FA,
      is_active: true,
      email_verified: true, // Mark as verified since they clicked the invitation link
      created_at: new Date().toISOString()
    });

    if (!newUser) {
      return NextResponse.json({
        error: 'Failed to create user profile'
      }, { status: 500 });
    }

    // Update invitation status
    await db.collection('user_invitations').updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: 'accepted',
          accepted_at: new Date().toISOString()
        }
      }
    );

    // Log the registration
    await createAuditLog({
      user_id: userId,
      table_name: 'users',
      record_id: userId,
      action: 'create',
      field_name: 'registration',
      old_value: null,
      new_value: 'User registered via invitation',
      description: 'User registered via invitation',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    });

    // EMAIL DISABLED: Email sending is disabled until a new email service provider is configured.
    // Welcome emails commented out - uncomment when new email provider is ready.
    console.log(`[EMAIL DISABLED] Welcome email for ${invitation.email}`);

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
