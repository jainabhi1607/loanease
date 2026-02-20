import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    const userData = await db.collection(COLLECTIONS.USERS).findOne({ _id: user.userId as any });

    if (!userData || (userData.role !== 'referrer_admin' && userData.role !== 'referrer_team')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userData.organisation_id) {
      const csvContent = 'Entity Name,First Name,Last Name,Email,Mobile,Opportunities Count\n';
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="Clients-${new Date().getTime()}.csv"`,
        },
      });
    }

    // Fetch clients for this organization
    const clients = await db.collection(COLLECTIONS.CLIENTS)
      .find({ organisation_id: userData.organisation_id })
      .sort({ created_at: -1 })
      .toArray();

    // Get opportunity counts
    const clientIds = clients.map((c: any) => c._id);
    const opportunityCounts = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({ client_id: { $in: clientIds as any }, status: { $ne: 'withdrawn' }, deleted_at: null })
      .project({ client_id: 1 })
      .toArray();

    const countsMap = new Map<string, number>();
    opportunityCounts.forEach((opp: any) => {
      countsMap.set(opp.client_id, (countsMap.get(opp.client_id) || 0) + 1);
    });

    const headers = ['Entity Name', 'First Name', 'Last Name', 'Email', 'Mobile', 'Opportunities Count'];

    const rows = clients.map((client: any) => [
      client.entity_name || '',
      client.contact_first_name || '',
      client.contact_last_name || '',
      client.contact_email || '',
      client.contact_phone || '',
      countsMap.get(client._id) || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Clients-${new Date().getTime()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting referrer clients CSV:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
