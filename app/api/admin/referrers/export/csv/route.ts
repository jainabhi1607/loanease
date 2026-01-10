import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('CSV Export - User ID:', user.userId);
    console.log('CSV Export - User Role:', user.role);

    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      console.log('CSV Export - Access denied. Role:', user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch all organisations
    const organisations = await db.collection('organisations')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    // Fetch all referrer admin users
    const users = await db.collection('users')
      .find({ role: 'referrer_admin' })
      .sort({ created_at: -1 })
      .toArray();

    // Create a map of users by organisation_id
    const usersByOrg = new Map();
    users?.forEach((user: any) => {
      if (user.organisation_id) {
        usersByOrg.set(user.organisation_id, user);
      }
    });

    // Combine organisations with their primary users
    const referrers = organisations?.map((org: any) => {
      const user = usersByOrg.get(org._id) || {};
      return {
        ...org,
        user,
      };
    }) || [];

    // Format date helper
    const formatDate = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Format state helper
    const formatState = (state: string | null) => {
      if (!state) return '';
      const stateMap: { [key: string]: string } = {
        'nsw': 'New South Wales',
        'vic': 'Victoria',
        'qld': 'Queensland',
        'sa': 'South Australia',
        'wa': 'Western Australia',
        'tas': 'Tasmania',
        'nt': 'Northern Territory',
        'act': 'Australian Capital Territory',
      };
      return stateMap[state.toLowerCase()] || state;
    };

    // Format industry type helper
    const formatIndustryType = (industryType: string | null) => {
      if (!industryType) return '';
      const industryMap: { [key: string]: string } = {
        'accountant': 'Accountant',
        'mortgage_broker': 'Mortgage Broker',
        'real_estate_agent': 'Real Estate Agent',
        'lawyer': 'Lawyer',
        'conveyancer': 'Conveyancer',
        'buyers_advocate': "Buyers' Advocate",
        'other': 'Other',
      };
      return industryMap[industryType] || industryType;
    };

    // Build CSV content
    const headers = [
      'Referrer Group',
      'Contact First Name',
      'Contact Last Name',
      'Email',
      'Phone',
      'State',
      'Status',
      'Industry Type',
      'Date of Registration',
    ];

    const rows = referrers.map((referrer: any) => {
      const user = referrer.user || {};
      return [
        referrer.company_name || '',
        user.first_name || '',
        user.surname || '',
        user.email || '',
        user.phone || '',
        formatState(referrer.state),
        referrer.is_active ? 'Active' : 'Inactive',
        formatIndustryType(referrer.industry_type),
        formatDate(referrer.created_at),
      ];
    });

    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape cells containing commas, quotes, or newlines
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Referrers-${new Date().getTime()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting referrers CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
