import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    // Check if user is authenticated
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();

    // Fetch opportunity with related data using aggregation
    const pipeline = [
      { $match: { _id: id as any, deleted_at: null } },
      // Join with clients
      {
        $lookup: {
          from: COLLECTIONS.CLIENTS,
          localField: 'client_id',
          foreignField: '_id',
          as: 'clients'
        }
      },
      { $unwind: { path: '$clients', preserveNullAndEmptyArrays: true } }
    ];

    const results = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate(pipeline).toArray();

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const opp = results[0] as any;

    // Fetch opportunity_details for financial fields
    const oppDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({ opportunity_id: id });
    const details = oppDetails as any || {};

    // Parse notes JSON if it exists (legacy fallback)
    let parsedNotes: any = {};
    if (opp.notes) {
      try {
        parsedNotes = JSON.parse(opp.notes);
      } catch (e) {
        parsedNotes = {};
      }
    }

    // Format entity type for display
    const formatEntityType = (type: string) => {
      const types: { [key: string]: string } = {
        'private_company': 'Private Company',
        'public_company': 'Public Company',
        'sole_trader': 'Sole Trader',
        'partnership': 'Partnership',
        'trust': 'Trust',
        'individual': 'Individual',
      };
      return types[type] || type;
    };

    // Format industry for display
    const formatIndustry = (industry: string) => {
      const industries: { [key: string]: string } = {
        'arts_and_lifestyle': 'Arts and Lifestyle',
        'building_and_trade': 'Building and Trade',
        'financial_services_and_insurance': 'Financial Services and Insurance',
        'hair_and_beauty': 'Hair and Beauty',
        'health': 'Health',
        'hospitality': 'Hospitality',
        'manufacturing': 'Manufacturing',
        'agriculture_farming_and_mining': 'Agriculture, Farming and Mining',
        'real_estate_and_property_management': 'Real Estate and Property Management',
        'services': 'Services',
        'professional_services': 'Professional Services',
        'retail': 'Retail',
        'transport_and_automotive': 'Transport and Automotive',
        'wholesaling': 'Wholesaling',
      };
      return industries[industry] || industry;
    };

    // Format loan type for display
    const formatLoanType = (type: string) => {
      const types: { [key: string]: string } = {
        'construction': 'Construction',
        'lease_doc': 'Lease Doc',
        'low_doc': 'Low Doc',
        'private_short_term': 'Private / Short Term',
        'unsure': 'Unsure',
      };
      return types[type] || type;
    };

    // Format asset type for display
    const formatAssetType = (type: string) => {
      const types: { [key: string]: string } = {
        'commercial_property': 'Commercial Property',
        'residential_property': 'Residential Property',
        'vacant_land': 'Vacant Land',
      };
      return types[type] || type;
    };

    // Format loan purpose for display
    const formatLoanPurpose = (purpose: string) => {
      const purposes: { [key: string]: string } = {
        'purchase_owner_occupier': 'Purchase Owner Occupier',
        'purchase_investment': 'Purchase Investment',
        'refinance': 'Refinance',
        'equity_release': 'Equity Release',
        'land_bank': 'Land Bank',
        'business_use': 'Business Use',
        'commercial_equipment': 'Commercial Equipment',
      };
      return purposes[purpose] || purpose;
    };

    // Format status for display
    const formatStatus = (status: string) => {
      const statuses: { [key: string]: string } = {
        'opportunity': 'Opportunity',
        'application_created': 'Application Created',
        'application_submitted': 'Application Submitted',
        'conditionally_approved': 'Conditionally Approved',
        'approved': 'Approved',
        'declined': 'Declined',
        'settled': 'Settled',
        'completed_declined': 'Completed Declined',
        'withdrawn': 'Withdrawn',
      };
      return statuses[status] || status;
    };

    // Build CSV content
    const csvHeaders = [
      'Dispatch Report', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    const fieldNames = [
      'Deal ID', 'External Deal ID', 'Entity', 'First Name', 'Last Name', 'Mobile', 'Email', 'Company Address', 'ABN', 'Time in business', 'Industry',
      'Type of Loan', 'Type of asset', 'Asset Address', 'Loan Amount', 'Estimated property value', 'Depreciation', 'Intrest', 'Loan Purpose',
      'Funded from Rental Income', 'Net Profit', 'Amortisation', 'Depreciation', 'Existing Interest Costs', 'Rental Expense', 'Proposed Rental Income',
      'Have any existing liabilities', 'Additional property security', 'SMSF structure', 'Existing ATO / tax liabilities', 'Any credit file issues',
      'Target Settlement Date', 'Date Settled', 'Loan Acc Ref Number', 'Flex ID', 'Payment Received', 'Payment Amount', 'Application Progress'
    ];

    // Helper to format currency values
    const formatCurrency = (value: any) => {
      if (!value) return '';
      const num = parseFloat(value);
      return isNaN(num) ? '' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Helper to format yes/no boolean fields
    const formatYesNo = (value: any) => {
      if (value === true || value === 'yes' || value === 1 || value === '1') return 'Yes';
      if (value === false || value === 'no' || value === 0 || value === '0') return 'No';
      return '';
    };

    const csvData = [
      opp.opportunity_id || '',
      opp.external_ref || '',
      formatEntityType(opp.entity_type) || '',
      opp.clients?.contact_first_name || '',
      opp.clients?.contact_last_name || '',
      opp.clients?.contact_phone || '',
      opp.clients?.contact_email || '',
      details.client_address || parsedNotes.client_address || '',
      (opp.clients?.abn && opp.clients.abn.replace(/0/g, '') !== '') ? opp.clients.abn : (opp.abn && opp.abn.replace(/0/g, '') !== '') ? opp.abn : '',
      opp.time_in_business || details.time_in_business || '',
      formatIndustry(opp.industry) || '',
      formatLoanType(opp.loan_type) || '',
      formatAssetType(opp.asset_type) || '',
      opp.asset_address || details.address || '',
      formatCurrency(opp.loan_amount),
      formatCurrency(opp.property_value),
      formatCurrency(details.deprecition), // Note: DB field has typo 'deprecition'
      formatCurrency(details.existing_interest_costs),
      formatLoanPurpose(opp.loan_purpose) || '',
      formatYesNo(details.rental_income),
      formatCurrency(details.net_profit),
      formatCurrency(details.ammortisation), // Note: DB field has typo 'ammortisation'
      formatCurrency(details.deprecition), // Note: DB field has typo 'deprecition'
      formatCurrency(details.existing_interest_costs),
      formatCurrency(details.rental_expense),
      formatCurrency(details.proposed_rental_income),
      formatYesNo(details.existing_liabilities),
      formatYesNo(details.additional_property),
      formatYesNo(details.smsf_structure),
      formatYesNo(details.ato_liabilities),
      formatYesNo(details.credit_file_issues),
      opp.target_settlement_date || '',
      opp.date_settled || '',
      opp.loan_acc_ref_no || details.loan_acc_ref_no || '',
      opp.flex_id || details.flex_id || '',
      opp.payment_received_date || details.payment_received_date || '',
      formatCurrency(opp.payment_amount || details.payment_amount),
      formatStatus(opp.status) || ''
    ];

    // Helper to escape CSV values (wrap in quotes if contains comma, quote, or newline)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Create CSV content with properly escaped values
    const csvContent = [
      csvHeaders.map(escapeCSV).join(','),
      fieldNames.map(escapeCSV).join(','),
      csvData.map(escapeCSV).join(',')
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Application-${opp.opportunity_id}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
