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
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

    // Send welcome emails
    try {
      const organisationId = invitation.organisation_id;

      if (organisationId) {
        // Get organisation details for welcome email
        const org = await findOrganisationById(organisationId);

        const { sendNewUserWelcomeEmail } = await import('@/lib/email/signup-emails');

        // Send welcome email
        await sendNewUserWelcomeEmail({
          email: invitation.email,
          firstName: firstName,
          password: '(You set your own password during registration)',
          companyName: org?.company_name || '',
        });
      } else {
        // For admin users, send a branded HTML welcome email
        const { sendHtmlEmail, wrapInBrandedTemplate, emailButton } = await import('@/lib/email/postmark');

        const statusBadge = `<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">Account Created</span>`;

        const content = `
          <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">Hi ${firstName},</p>

          <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Welcome to <strong>Loanease</strong>! Your account has been created successfully.</p>

          <div style="text-align: center; margin: 25px 0;">${statusBadge}</div>

          <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">You can now log in to access the platform.</p>

          <div style="text-align: center; margin: 25px 0;">
            ${emailButton('Login to Loanease', `${process.env.NEXT_PUBLIC_APP_URL}/login`)}
          </div>

          <p style="font-size: 15px; color: #374151; margin: 0;">Thank you for joining Loanease.</p>
        `;

        await sendHtmlEmail({
          to: invitation.email,
          subject: 'Welcome to Loanease',
          htmlBody: wrapInBrandedTemplate(content, 'Welcome'),
          from: 'partners@loanease.com',
        });
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the registration if email fails
    }

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
