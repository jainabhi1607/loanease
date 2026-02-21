import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { z } from 'zod';
import { getInvitationExpiryDays } from '@/lib/mongodb/repositories/global-settings';

const createAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['super_admin', 'admin_team']),
});

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Only Super Admins can access user management' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch all admin users (super_admin and admin_team)
    const adminUsers = await db.collection('users')
      .find({ role: { $in: ['super_admin', 'admin_team'] } })
      .project({
        _id: 1,
        email: 1,
        first_name: 1,
        surname: 1,
        phone: 1,
        role: 1,
        status: 1,
        two_fa_enabled: 1,
        created_at: 1,
        last_login_at: 1
      })
      .sort({ created_at: -1 })
      .toArray();

    // Fetch pending admin invitations
    const invitations = await db.collection('user_invitations')
      .find({
        organisation_id: null, // Admin invitations have null org_id
        status: 'pending'
      })
      .project({
        _id: 1,
        email: 1,
        created_at: 1,
        expires_at: 1,
        metadata: 1,
        token: 1
      })
      .sort({ created_at: -1 })
      .toArray();

    // Format existing users
    const formattedUsers = (adminUsers || []).map((user: any) => ({
      id: user._id,
      email: user.email,
      name: `${user.first_name || ''} ${user.surname || ''}`.trim() || 'Unknown',
      mobile: user.phone || '',
      phone: user.phone || '',
      role: user.role,
      roleDisplay: user.role === 'super_admin' ? 'Super Admin' : 'Administrator',
      twoFactorEnabled: user.two_fa_enabled,
      status: user.status || 'active',
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      isInvitation: false,
    }));

    // Format pending invitations
    const formattedInvitations = (invitations || []).map((invite: any) => ({
      id: invite._id,
      email: invite.email,
      name: 'Pending Setup', // User will add their name during registration
      role: invite.metadata?.role || 'admin_team',
      roleDisplay: invite.metadata?.role === 'super_admin' ? 'Super Admin' : 'Administrator',
      twoFactorEnabled: false,
      status: 'invited',
      createdAt: invite.created_at,
      lastLoginAt: null,
      isInvitation: true,
      expiresAt: invite.expires_at,
      token: invite.token,
    }));

    // Combine and sort by creation date
    const allUsers = [...formattedUsers, ...formattedInvitations].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ users: allUsers });

  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is a super admin
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admins can add new administrators' }, { status: 403 });
    }

    const db = await getDatabase();

    // Parse and validate input
    const body = await request.json();
    const validatedData = createAdminSchema.parse(body);
    const { email, role } = validatedData;

    // Check if user with this email already exists
    const existingUser = await db.collection('users').findOne({ email });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await db.collection('user_invitations').findOne({
      email,
      status: 'pending'
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
    }

    // Generate invitation token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    // Create invitation record with metadata for admin details
    const invitationId = crypto.randomUUID();
    const invitation = {
      _id: invitationId,
      email: email,
      token: token,
      organisation_id: null, // null for system admin invitations
      invited_by: user.userId,
      status: 'pending',
      expires_at: new Date(Date.now() + (await getInvitationExpiryDays()) * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        role: role,
        is_admin: true,
        force_2fa: true // Force 2FA for all admin users
      },
      created_at: new Date().toISOString()
    };

    await db.collection('user_invitations').insertOne(invitation as any);

    // Get inviter details
    const inviter = await db.collection('users').findOne(
      { _id: user.userId as any },
      { projection: { first_name: 1, surname: 1 } }
    );

    const inviterName = inviter ? `${inviter.first_name} ${inviter.surname}` : 'System Administrator';

    // EMAIL DISABLED: Email sending is disabled until a new email service provider is configured.
    // try {
    //   const { sendUserInvitation } = await import('@/lib/email/postmark');
    //   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.loanease.com';
    //   const inviteUrl = `${baseUrl}/auth/complete-registration?token=${token}`;
    //   const emailResult = await sendUserInvitation(email, inviteUrl, 'Loanease Admin Portal', inviterName, new Date(invitation.expires_at));
    //   if (!emailResult.success) {
    //     console.error('Error sending invitation email');
    //   } else {
    //     console.log('Admin invitation email sent successfully to:', email);
    //   }
    // } catch (emailError) {
    //   console.error('Error sending invitation email:', emailError);
    // }
    console.log(`[EMAIL DISABLED] Admin invitation email for ${email}`);

    // Log the invitation
    await db.collection('audit_logs').insertOne({
      user_id: user.userId,
      table_name: 'user_invitations',
      record_id: invitationId,
      action: 'create',
      field_name: 'admin_invitation',
      new_value: `Admin invitation sent to: ${email} with role: ${role}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully. The administrator will receive an email to set up their account.',
      invitation: {
        id: invitationId,
        email: email,
        role: role,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in create admin invitation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
