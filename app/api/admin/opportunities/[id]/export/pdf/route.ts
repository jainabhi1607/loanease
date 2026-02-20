import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import * as React from 'react';

// Create styles matching the sample PDF design
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#D4E8D4',
    padding: '20 30',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    paddingHorizontal: 50,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  label: {
    width: 200,
    fontSize: 11,
    color: '#000000',
  },
  value: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
});

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

    // Fetch opportunity_details for additional fields
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

    // Format functions
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

    const formatAssetType = (type: string) => {
      const types: { [key: string]: string } = {
        'commercial_property': 'Commercial Property',
        'residential_property': 'Residential Property',
        'vacant_land': 'Vacant Land',
      };
      return types[type] || type;
    };

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

    // Create PDF document using React PDF with createElement
    const MyDocument = React.createElement(
      Document,
      {},
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        // Header with light green background
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.title }, 'Application Details')
        ),
        // Content
        React.createElement(
          View,
          { style: styles.content },
          // Deal ID
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Deal ID:'),
            React.createElement(Text, { style: styles.value }, opp.opportunity_id || '')
          ),
          // Name
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Name:'),
            React.createElement(Text, { style: styles.value }, `${opp.clients?.contact_first_name || ''} ${opp.clients?.contact_last_name || ''}`.trim())
          ),
          // Mobile
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Mobile:'),
            React.createElement(Text, { style: styles.value }, opp.clients?.contact_phone || '')
          ),
          // Email
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Email:'),
            React.createElement(Text, { style: styles.value }, opp.clients?.contact_email || '')
          ),
          // Company Address
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Company Address:'),
            React.createElement(Text, { style: styles.value }, details.client_address || parsedNotes.client_address || '')
          ),
          // ABN
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'ABN:'),
            React.createElement(Text, { style: styles.value }, (opp.clients?.abn && opp.clients.abn.replace(/0/g, '') !== '') ? opp.clients.abn : (opp.abn && opp.abn.replace(/0/g, '') !== '') ? opp.abn : '')
          ),
          // Time in business
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Time in business:'),
            React.createElement(Text, { style: styles.value }, opp.time_in_business || parsedNotes.time_in_business || '')
          ),
          // Industry
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Industry:'),
            React.createElement(Text, { style: styles.value }, formatIndustry(opp.industry) || '')
          ),
          // Type of Loan
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Type of Loan:'),
            React.createElement(Text, { style: styles.value }, formatLoanType(opp.loan_type) || '')
          ),
          // Type of asset
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Type of asset:'),
            React.createElement(Text, { style: styles.value }, formatAssetType(opp.asset_type) || '')
          ),
          // Asset Address
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Asset Address:'),
            React.createElement(Text, { style: styles.value }, opp.asset_address || details.address || parsedNotes.asset_address || '')
          ),
          // Loan Amount
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Loan Amount:'),
            React.createElement(Text, { style: styles.value }, opp.loan_amount ? `₹${parseFloat(opp.loan_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '')
          ),
          // Estimated property value
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Estimated property value:'),
            React.createElement(Text, { style: styles.value }, opp.property_value ? `₹${parseFloat(opp.property_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '')
          ),
          // Depreciation (note: DB field has typo 'deprecition')
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Depreciation:'),
            React.createElement(Text, { style: styles.value }, details.deprecition ? `₹${parseFloat(details.deprecition).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '')
          ),
          // Interest (existing interest costs)
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Interest:'),
            React.createElement(Text, { style: styles.value }, details.existing_interest_costs ? `₹${parseFloat(details.existing_interest_costs).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '')
          ),
          // Loan Purpose
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Loan Purpose:'),
            React.createElement(Text, { style: styles.value }, formatLoanPurpose(opp.loan_purpose) || '')
          ),
          // Target Settlement Date
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Target Settlement Date:'),
            React.createElement(Text, { style: styles.value }, opp.target_settlement_date || '')
          ),
          // Date Settled
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Date Settled:'),
            React.createElement(Text, { style: styles.value }, opp.date_settled || '')
          )
        )
      )
    );

    // Generate PDF
    const pdfBlob = await pdf(MyDocument).toBlob();
    const pdfBuffer = await pdfBlob.arrayBuffer();

    // Return PDF file
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Application-${opp.opportunity_id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
