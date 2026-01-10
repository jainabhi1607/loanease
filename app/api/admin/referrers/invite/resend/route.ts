import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';
import { z } from 'zod';
import crypto from 'crypto';
import { createAuditLog } from '@/lib/mongodb/repositories/audit-logs';

const resendSchema = z.object({
  inviteId: z.string().uuid('Invalid invitation ID'),
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate input
    const body = await request.json();
    const validatedData = resendSchema.parse(body);
    const { inviteId } = validatedData;

    const db = await getDatabase();

    // Fetch the invitation with organisation details using aggregation
    const invitationResults = await db.collection('user_invitations').aggregate([
      { $match: { _id: inviteId, status: 'pending' } },
      {
        $lookup: {
          from: 'organisations',
          localField: 'organisation_id',
          foreignField: '_id',
          as: 'organisations'
        }
      },
      { $unwind: { path: '$organisations', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    const invitation = invitationResults[0];

    if (!invitation) {
      return NextResponse.json({
        error: 'Invitation not found or already accepted'
      }, { status: 404 });
    }

    // Check user permissions
    const isAdmin = user.role === 'super_admin' || user.role === 'admin_team';
    const isReferrerAdmin = user.role === 'referrer_admin' && user.organisationId === invitation.organisation_id;

    if (!isAdmin && !isReferrerAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check resend limit (max 5 resends)
    if (invitation.resent_count >= 5) {
      return NextResponse.json({
        error: 'Maximum resend limit reached. Please create a new invitation.'
      }, { status: 400 });
    }

    // Check if last resent was within 1 minute (rate limiting)
    if (invitation.last_resent_at) {
      const lastResent = new Date(invitation.last_resent_at);
      const now = new Date();
      const minutesSinceLastResend = (now.getTime() - lastResent.getTime()) / 60000;

      if (minutesSinceLastResend < 1) {
        return NextResponse.json({
          error: 'Please wait at least 1 minute before resending'
        }, { status: 429 });
      }
    }

    // Generate new token and expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation with new token and expiry
    const updateResult = await db.collection('user_invitations').updateOne(
      { _id: inviteId as any },
      {
        $set: {
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          resent_count: invitation.resent_count + 1,
          last_resent_at: new Date().toISOString()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      console.error('Error updating invitation: not found');
      return NextResponse.json({
        error: 'Failed to update invitation'
      }, { status: 500 });
    }

    // Get inviter details for the email
    const inviter = await db.collection('users').findOne({ _id: user.userId as any });
    const inviterName = inviter ? `${inviter.first_name} ${inviter.surname}` : 'Admin';

    // Resend invitation email
    try {
      const { sendUserInvitation } = await import('@/lib/email/postmark');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cluefinance.com.au';
      const inviteUrl = `${baseUrl}/auth/complete-registration?token=${newToken}`;

      const emailResult = await sendUserInvitation(
        invitation.email,
        inviteUrl,
        invitation.organisations?.company_name || 'Organisation',
        inviterName,
        newExpiresAt
      );

      if (!emailResult.success) {
        console.error('Error sending invitation email:', emailResult.error);
        return NextResponse.json({
          error: 'Failed to send invitation email'
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return NextResponse.json({
        error: 'Failed to send invitation email'
      }, { status: 500 });
    }

    // Log the resend
    await createAuditLog({
      user_id: user.userId,
      table_name: 'user_invitations',
      record_id: inviteId,
      action: 'resend',
      field_name: 'invitation',
      old_value: null,
      new_value: `Resent invitation to ${invitation.email} (attempt ${invitation.resent_count + 1})`,
      description: null,
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      resent_count: invitation.resent_count + 1
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resending the invitation' },
      { status: 500 }
    );
  }
}
