import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

const inviteSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  organisationId: z.string().uuid('Invalid organisation ID'),
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin or referrer admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate input
    const body = await request.json();
    const validatedData = inviteSchema.parse(body);
    const { email, organisationId } = validatedData;

    // Check permissions
    const isAdmin = user.role === 'super_admin' || user.role === 'admin_team';
    const isReferrerAdmin = user.role === 'referrer_admin' && user.organisationId === organisationId;

    if (!isAdmin && !isReferrerAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = await getDatabase();

    // Check if user already exists in the organisation
    const existingUser = await db.collection('users').findOne({
      email: email,
      organisation_id: organisationId
    });

    if (existingUser) {
      return NextResponse.json({
        error: 'A user with this email already exists in the organisation'
      }, { status: 400 });
    }

    // Check if there's already a pending invitation
    const existingInvite = await db.collection('user_invitations').findOne({
      email: email,
      organisation_id: organisationId,
      status: 'pending'
    });

    if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
      return NextResponse.json({
        error: 'An invitation has already been sent to this email address'
      }, { status: 400 });
    }

    // Get organisation details for the email
    const organisation = await db.collection('organisations').findOne({ _id: organisationId as any });

    if (!organisation) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitationId = uuidv4();
    const invitation = {
      _id: invitationId,
      organisation_id: organisationId,
      email,
      token,
      invited_by: user.userId,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      resent_count: 0,
      last_resent_at: null,
      created_at: new Date().toISOString()
    };

    await db.collection('user_invitations').insertOne(invitation as any);

    // Get inviter details
    const inviter = await db.collection('users').findOne({ _id: user.userId as any });
    const inviterName = inviter ? `${inviter.first_name} ${inviter.surname}` : 'Admin';

    // Send invitation email
    try {
      const { sendUserInvitation } = await import('@/lib/email/postmark');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cluefinance.com.au';
      const inviteUrl = `${baseUrl}/auth/complete-registration?token=${token}`;

      const emailResult = await sendUserInvitation(
        email,
        inviteUrl,
        organisation.company_name,
        inviterName,
        expiresAt
      );

      if (!emailResult.success) {
        // Delete the invitation if email fails
        await db.collection('user_invitations').deleteOne({ _id: invitationId as any });

        console.error('Error sending invitation email:', emailResult.error);
        return NextResponse.json({
          error: 'Failed to send invitation email'
        }, { status: 500 });
      }
    } catch (error) {
      // Delete the invitation if email fails
      await db.collection('user_invitations').deleteOne({ _id: invitationId as any });

      console.error('Error sending invitation email:', error);
      return NextResponse.json({
        error: 'Failed to send invitation email'
      }, { status: 500 });
    }

    // Log the invitation
    await createAuditLog({
      user_id: user.userId,
      table_name: 'user_invitations',
      record_id: invitationId,
      action: 'create',
      field_name: 'invitation',
      old_value: null,
      new_value: `Invited ${email} to ${organisation.company_name}`,
      description: null,
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email: email,
        expires_at: expiresAt.toISOString()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Invitation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending the invitation' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch invitations for an organisation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organisationId = searchParams.get('organisationId');

    if (!organisationId) {
      return NextResponse.json({ error: 'Organisation ID is required' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'super_admin' || user.role === 'admin_team';
    const isReferrerAdmin = user.role === 'referrer_admin' && user.organisationId === organisationId;

    if (!isAdmin && !isReferrerAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch pending invitations
    const invitations = await db.collection('user_invitations')
      .find({
        organisation_id: organisationId,
        status: 'pending'
      })
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ invitations });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching invitations' },
      { status: 500 }
    );
  }
}
