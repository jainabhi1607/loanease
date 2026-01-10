import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Fetch invitation by token
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
      // Update status to expired
      await db.collection('user_invitations').updateOne(
        { _id: invitation._id },
        { $set: { status: 'expired' } }
      );

      return NextResponse.json({
        error: 'This invitation has expired'
      }, { status: 400 });
    }

    // Get organisation name
    let organisationName = 'Organisation';
    if (invitation.organisation_id) {
      const organisation = await db.collection('organisations').findOne({
        _id: invitation.organisation_id
      });
      organisationName = organisation?.company_name || 'Organisation';
    }

    return NextResponse.json({
      email: invitation.email,
      organisationName,
      organisationId: invitation.organisation_id,
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying the invitation' },
      { status: 500 }
    );
  }
}
