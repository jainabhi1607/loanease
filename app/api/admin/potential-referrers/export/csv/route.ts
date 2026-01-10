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

    // Format date helper
    const formatDate = (dateValue: Date | string) => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
    };

    // Create CSV content
    const headers = ['S. No.', 'Date', 'Name', 'Email', 'Phone'];
    const rows = contacts?.map((contact: any, index: number) => [
      index + 1,
      formatDate(contact.created_at),
      `${contact.first_name} ${contact.last_name}`,
      contact.email,
      contact.phone || ''
    ]) || [];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="Potential Referrers.csv"',
      },
    });

  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
