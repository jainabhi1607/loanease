import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['super_admin', 'admin_team'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch all pre-assessment contacts
    const contacts = await db.collection(COLLECTIONS.PRE_ASSESSMENT_CONTACTS)
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    // Map _id to id for frontend compatibility
    const formattedContacts = contacts.map((contact: any) => ({
      id: contact._id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      ip_address: contact.ip_address,
      created_at: contact.created_at,
    }));

    return NextResponse.json({ contacts: formattedContacts || [] });

  } catch (error) {
    console.error('Error in potential referrers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
