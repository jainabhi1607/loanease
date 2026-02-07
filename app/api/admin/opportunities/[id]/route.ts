import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { sendStatusChangeEmails } from '@/lib/email/postmark';
import { v4 as uuidv4 } from 'uuid';

// Convert DB risk indicator value (0/1, "yes"/"no", true/false) to display string
const toYesNo = (val: any): string => {
  if (val === null || val === undefined) return 'No';
  if (val === 1 || val === '1' || val === true || (typeof val === 'string' && val.toLowerCase() === 'yes')) return 'Yes';
  if (val === 0 || val === '0' || val === false || (typeof val === 'string' && val.toLowerCase() === 'no')) return 'No';
  return 'No';
};

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
      { $unwind: { path: '$clients', preserveNullAndEmptyArrays: true } },
      // Join with organisations
      {
        $lookup: {
          from: COLLECTIONS.ORGANISATIONS,
          localField: 'organization_id',
          foreignField: '_id',
          as: 'organisations'
        }
      },
      { $unwind: { path: '$organisations', preserveNullAndEmptyArrays: true } }
    ];

    const results = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate(pipeline).toArray();

    if (!results || results.length === 0) {
      console.error('Error fetching opportunity: not found');
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const opp = results[0] as any;

    // Log RAW opportunity data from database
    console.log('Admin API GET - RAW DB VALUES:', {
      id: opp._id,
      entity_type: opp.entity_type,
      industry: opp.industry,
      time_in_business: opp.time_in_business,
      abn: opp.abn
    });

    // Fetch opportunity details from the details collection
    const oppDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({ opportunity_id: id });

    // Type assertion for details data
    const details = (oppDetails || {}) as any;

    // Log details fetch for debugging
    console.log('Admin API - Opportunity details fetch:', {
      opportunityId: id,
      hasDetails: !!oppDetails,
      detailsKeys: oppDetails ? Object.keys(oppDetails) : [],
      client_address: details.client_address,
      time_in_business: details.time_in_business
    });

    // Fetch creator user separately (no FK relationship exists)
    const creator = await db.collection(COLLECTIONS.USERS).findOne({ _id: opp.created_by });

    // Clean up invalid legacy data to match current database constraints
    // Valid asset_type values: commercial_property, residential_property, vacant_land
    const validAssetTypes = ['commercial_property', 'residential_property', 'vacant_land'];
    const assetType = validAssetTypes.includes(opp.asset_type) ? opp.asset_type : null;

    // Valid industry values
    const validIndustries = [
      'arts_and_lifestyle', 'building_and_trade', 'financial_services_and_insurance',
      'hair_and_beauty', 'health', 'hospitality', 'manufacturing',
      'agriculture_farming_and_mining', 'real_estate_and_property_management',
      'services', 'professional_services', 'retail', 'transport_and_automotive', 'wholesaling'
    ];
    const industry = validIndustries.includes(opp.industry) ? opp.industry : null;

    // Valid loan_type values: construction, lease_doc, low_doc, private_short_term, unsure
    const validLoanTypes = ['construction', 'lease_doc', 'low_doc', 'private_short_term', 'unsure'];
    let loanType = opp.loan_type;
    // Convert legacy display values to snake_case
    if (loanType === 'Construction') loanType = 'construction';
    else if (loanType === 'Lease Doc') loanType = 'lease_doc';
    else if (loanType === 'Low Doc') loanType = 'low_doc';
    else if (loanType === 'Private/Short Term' || loanType === 'Private / Short Term') loanType = 'private_short_term';
    else if (loanType === 'Unsure') loanType = 'unsure';
    else if (!validLoanTypes.includes(loanType)) loanType = null;

    // Transform the data - Read ONLY from proper columns, no notes fallback
    const transformedOpportunity = {
      id: opp._id,
      opportunity_id: opp.opportunity_id,
      status: opp.status,
      created_at: opp.created_at,
      external_ref: opp.external_ref || '',

      // Client Details (entity_type and industry are on opportunities table, not clients)
      client_entity_type: opp.entity_type || '',
      client_entity_name: opp.clients?.entity_name || '',
      client_contact_name: `${opp.clients?.contact_first_name || ''} ${opp.clients?.contact_last_name || ''}`.trim(),
      client_mobile: opp.clients?.contact_phone || '',
      client_email: opp.clients?.contact_email || '',
      client_address: details.client_address || '',
      client_abn: (opp.clients?.abn && opp.clients.abn.replace(/0/g, '') !== '') ? opp.clients.abn : (opp.abn && opp.abn.replace(/0/g, '') !== '') ? opp.abn : '',
      client_time_in_business: opp.time_in_business || details.time_in_business || '',
      client_industry: industry || '', // Use cleaned industry value
      client_brief_overview: details.brief_overview || '',

      // Loan Details (use cleaned values)
      loan_asset_type: assetType || '',
      loan_asset_address: opp.asset_address || details.address || '',
      loan_amount: opp.loan_amount || 0,
      loan_property_value: opp.property_value || 0,
      loan_type: loanType || '',
      loan_purpose: opp.loan_purpose || '',
      lender: opp.lender || '',

      // Financial Details (read from opportunity_details table only)
      rental_income: details.rental_income || 'No',
      net_profit: details.net_profit || 0,
      amortisation: details.ammortisation || 0,
      depreciation: details.deprecition || 0,
      existing_interest: details.existing_interest_costs || 0,
      rental_expense: details.rental_expense || 0,
      proposed_rental_income: details.proposed_rental_income || 0,
      existing_liabilities: toYesNo(details.existing_liabilities),
      additional_security: toYesNo(details.additional_property),
      smsf_structure: toYesNo(details.smsf_structure),
      ato_liabilities: toYesNo(details.ato_liabilities),
      credit_issues: toYesNo(details.credit_file_issues),
      icr: opp.icr || 0,
      lvr: opp.lvr || 0,

      // Address fields from opportunity_details
      detail_address: details.address || '',
      detail_street_address: details.street_address || '',
      detail_city: details.city || '',
      detail_state: details.state || null,
      detail_postcode: details.postcode || '',

      // Additional fields from opportunity_details
      reason_declined: details.reason_declined || '',
      disqualify_reason: details.disqualify_reason || '',
      time_in_business: details.time_in_business || '',
      brief_overview: details.brief_overview || '',
      outcome_level: details.outcome_level || '',
      additional_notes: details.additional_notes || '',
      loan_acc_ref_no: details.loan_acc_ref_no || '',
      flex_id: details.flex_id || '',
      payment_received_date: details.payment_received_date || null,
      payment_amount: details.payment_amount || 0,
      deal_finalisation_status: details.deal_finalisation_status || '',

      // Unqualified tracking
      is_unqualified: details.is_unqualified || 0,
      unqualified_date: details.unqualified_date || null,
      unqualified_reason: details.unqualified_reason || '',

      // Terms acceptance
      term1: details.term1 || 0,
      term2: details.term2 || 0,
      term3: details.term3 || 0,
      term4: details.term4 || 0,

      // Other
      target_settlement_date: opp.target_settlement_date,
      date_settled: opp.date_settled,
      notes: opp.notes, // Keep notes as free-text field only

      // Related
      referrer_group: opp.organisations?.company_name || '',
      team_member: creator ? `${(creator as any).first_name} ${(creator as any).surname}` : '',
      organization_id: opp.organization_id || '',
      created_by: opp.created_by || '',
      client_id: opp.client_id || '',
    };

    // Log what we're returning for debugging - v3 comprehensive
    console.log('Admin API GET - ENTITY AND INDUSTRY DEBUG v3:', {
      raw_opp_entity_type: opp.entity_type,
      raw_opp_industry: opp.industry,
      validated_industry: industry,
      transformed_client_entity_type: transformedOpportunity.client_entity_type,
      transformed_client_industry: transformedOpportunity.client_industry,
      client_time_in_business: transformedOpportunity.client_time_in_business,
      client_address: transformedOpportunity.client_address
    });

    return NextResponse.json({ opportunity: transformedOpportunity });

  } catch (error) {
    console.error('Error in opportunity detail API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json();
    const db = await getDatabase();

    // Get current opportunity data before update (for status change detection and email)
    let oldStatus = null;
    let opportunityDetails: any = null;
    if (body.status !== undefined) {
      const pipeline = [
        { $match: { _id: id as any } },
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

      const currentOppResults = await db.collection(COLLECTIONS.OPPORTUNITIES).aggregate(pipeline).toArray();

      if (currentOppResults && currentOppResults.length > 0) {
        const currentOpp = currentOppResults[0];
        oldStatus = currentOpp.status;
        opportunityDetails = currentOpp;
      }
    }

    // Sanitize update data - separate fields for opportunities vs opportunity_details tables
    const opportunitiesUpdateData: any = {};
    const detailsUpdateData: any = {};

    // List of valid fields that can be updated on opportunities table
    const opportunitiesFields = [
      'entity_type', 'industry', 'time_in_business', 'abn',
      'loan_amount', 'property_value', 'loan_type', 'loan_purpose',
      'asset_type', 'asset_address', 'lender', 'lvr', 'icr', 'external_ref',
      'target_settlement_date', 'date_settled', 'status', 'notes',
      'declined_reason', 'completed_declined_reason', 'withdrawn_reason',
      'created_by'
    ];

    // List of valid fields that can be updated on opportunity_details table
    const detailsFields = [
      'address', 'street_address', 'city', 'state', 'postcode',
      'net_profit', 'ammortisation', 'deprecition', 'existing_interest_costs',
      'rental_expense', 'proposed_rental_income', 'existing_liabilities',
      'additional_property', 'smsf_structure', 'ato_liabilities', 'credit_file_issues',
      'term1', 'term2', 'term3', 'term4',
      'reason_declined', 'disqualify_reason',
      'client_address', 'time_in_business', 'brief_overview',
      'outcome_level', 'additional_notes', 'rental_income',
      'loan_acc_ref_no', 'flex_id', 'payment_received_date', 'payment_amount',
      'ip_address',
      'is_unqualified', 'unqualified_date', 'unqualified_reason',
      'deal_finalisation_status'
    ];

    // Only include valid fields for opportunities table and convert empty strings to null
    for (const field of opportunitiesFields) {
      if (field in body) {
        // Convert empty strings to null for database
        opportunitiesUpdateData[field] = body[field] === '' ? null : body[field];
      }
    }

    // Only include valid fields for opportunity_details table and convert empty strings to null
    for (const field of detailsFields) {
      if (field in body) {
        // Handle boolean fields - convert Yes/No to 1/0 (case-insensitive)
        if (['existing_liabilities', 'additional_property', 'smsf_structure', 'ato_liabilities', 'credit_file_issues', 'is_unqualified'].includes(field)) {
          const value = typeof body[field] === 'string' ? body[field].toLowerCase() : body[field];
          if (value === 'yes' || value === 1 || value === true) detailsUpdateData[field] = 1;
          else if (value === 'no' || value === 0 || value === false) detailsUpdateData[field] = 0;
          else detailsUpdateData[field] = null;
        } else {
          // Convert empty strings to null for database
          detailsUpdateData[field] = body[field] === '' ? null : body[field];
        }
      }
    }

    console.log('Sanitized opportunities update data:', opportunitiesUpdateData);
    console.log('Sanitized details update data:', detailsUpdateData);

    // Update opportunities table if there are fields to update
    let opportunity = null;
    if (Object.keys(opportunitiesUpdateData).length > 0) {
      const updateResult = await db.collection(COLLECTIONS.OPPORTUNITIES).findOneAndUpdate(
        { _id: id as any },
        { $set: opportunitiesUpdateData },
        { returnDocument: 'after' }
      );

      if (!updateResult) {
        console.error('No opportunity found with id:', id);
        return NextResponse.json({
          error: 'Opportunity not found',
          details: 'The opportunity does not exist or could not be updated'
        }, { status: 404 });
      }

      opportunity = updateResult;
    }

    // Update or insert opportunity_details table if there are fields to update
    if (Object.keys(detailsUpdateData).length > 0) {
      // Check if details record exists
      const existingDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({ opportunity_id: id });

      if (existingDetails) {
        // Update existing record
        await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).updateOne(
          { opportunity_id: id },
          { $set: detailsUpdateData }
        );
      } else {
        // Insert new record
        await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).insertOne({
          _id: uuidv4() as any,
          opportunity_id: id,
          ...detailsUpdateData,
          created_at: new Date()
        });
      }
    }

    // If no valid fields to update in either table, return success
    if (Object.keys(opportunitiesUpdateData).length === 0 && Object.keys(detailsUpdateData).length === 0) {
      console.log('No valid fields to update');
      return NextResponse.json({
        success: true,
        message: 'No changes to update'
      });
    }

    // Determine descriptive field_name for audit log
    const auditFieldName = body.finalise_complete ? 'deal_finalisation' : determineAuditFieldName(body);

    // Log audit trail
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: uuidv4() as any,
      user_id: user.userId,
      table_name: 'opportunities',
      record_id: opportunity?._id || id,
      action: body.finalise_complete ? 'finalise_complete' : 'update',
      field_name: auditFieldName,
      new_value: body.finalise_complete ? 'Deal Finalisation Info completed.' : JSON.stringify(body),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date()
    });

    // Send status change emails if status changed to an application status
    if (body.status !== undefined && oldStatus !== body.status && opportunityDetails) {
      const statusesThatTriggerEmail = [
        'application_created',
        'application_submitted',
        'conditionally_approved',
        'approved',
        'settled',
        'declined',
        'withdrawn'
      ];

      if (statusesThatTriggerEmail.includes(body.status)) {
        try {
          const clients = opportunityDetails.clients || {};
          const clientName = `${clients.contact_first_name || ''} ${clients.contact_last_name || ''}`.trim() || 'Client';
          const clientEmail = clients.contact_email || '';
          const entityName = clients.entity_name || '';
          const applicationId = opportunityDetails.opportunity_id || '';

          // Get referrer user details
          let referrerName = '';
          let referrerEmail = '';
          if (opportunityDetails.created_by) {
            const referrerUser = await db.collection(COLLECTIONS.USERS).findOne({ _id: opportunityDetails.created_by });

            if (referrerUser) {
              referrerName = `${(referrerUser as any).first_name || ''} ${(referrerUser as any).surname || ''}`.trim() || 'Partner';
              referrerEmail = (referrerUser as any).email || '';
            }
          }

          // Get reason for declined/withdrawn if applicable
          let reasonDeclined = '';
          if (body.status === 'declined' || body.status === 'withdrawn') {
            // Check if reason is in the body
            reasonDeclined = body.reason_declined || body.declined_reason || body.withdrawn_reason || '';

            // If not in body, try to get from opportunity_details
            if (!reasonDeclined) {
              const details = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({ opportunity_id: id });
              if (details) {
                reasonDeclined = (details as any).reason_declined || '';
              }
            }
          }

          console.log('Sending status change emails:', {
            newStatus: body.status,
            oldStatus,
            clientEmail,
            clientName,
            referrerEmail,
            referrerName,
            applicationId,
            entityName
          });

          // Send emails
          await sendStatusChangeEmails({
            clientEmail,
            clientName,
            referrerEmail,
            referrerName,
            applicationId,
            entityName,
            newStatus: body.status,
            reasonDeclined
          });

        } catch (emailError) {
          // Log error but don't fail the request
          console.error('Error sending status change emails:', emailError);
        }
      }
    }

    return NextResponse.json({ success: true, opportunity });

  } catch (error) {
    console.error('Error in opportunity update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Soft delete the opportunity by setting deleted_at timestamp
    const deleteResult = await db.collection(COLLECTIONS.OPPORTUNITIES).updateOne(
      { _id: id as any, deleted_at: null },
      { $set: { deleted_at: new Date() } }
    );

    if (deleteResult.matchedCount === 0) {
      console.error('Error deleting opportunity: not found or already deleted');
      return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
    }

    // Log the deletion in audit_logs
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: uuidv4() as any,
      user_id: user.userId,
      table_name: 'opportunities',
      record_id: id,
      action: 'delete',
      field_name: 'deleted_at',
      old_value: null,
      new_value: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: 'Opportunity deleted successfully' });

  } catch (error) {
    console.error('Error in opportunity delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to determine a descriptive field name for audit logging
function determineAuditFieldName(body: any): string {
  // Check for unqualified status change (highest priority)
  if (body.is_unqualified !== undefined) {
    return 'unqualified_status';
  }

  // Check for status change
  if (body.status !== undefined) {
    return 'status_change';
  }

  // Check for target settlement date
  if (body.target_settlement_date !== undefined) {
    return 'target_settlement';
  }

  // Check for date settled
  if (body.date_settled !== undefined) {
    return 'date_settled';
  }

  // Check for external reference
  if (body.external_ref !== undefined) {
    return 'external_ref';
  }

  // Check for team member change
  if (body.created_by !== undefined) {
    return 'team_member';
  }

  // Check for lender change
  if (body.lender !== undefined) {
    return 'lender';
  }

  // Client details changes
  const clientFields = ['entity_type', 'industry', 'time_in_business', 'abn', 'client_address', 'brief_overview'];
  if (clientFields.some(f => body[f] !== undefined)) {
    return 'client_details';
  }

  // Loan details changes
  const loanFields = ['loan_amount', 'property_value', 'loan_type', 'loan_purpose', 'asset_type', 'asset_address'];
  if (loanFields.some(f => body[f] !== undefined)) {
    return 'loan_details';
  }

  // Financial details changes
  const financialFields = ['net_profit', 'ammortisation', 'deprecition', 'existing_interest_costs',
    'rental_expense', 'proposed_rental_income', 'existing_liabilities', 'additional_property',
    'smsf_structure', 'ato_liabilities', 'credit_file_issues', 'rental_income'];
  if (financialFields.some(f => body[f] !== undefined)) {
    return 'financial_details';
  }

  // Payment info changes
  if (body.payment_received_date !== undefined || body.payment_amount !== undefined) {
    return 'payment_info';
  }

  // Loan reference changes
  if (body.loan_acc_ref_no !== undefined || body.flex_id !== undefined) {
    return 'loan_reference';
  }

  // Declined/withdrawn reasons
  if (body.declined_reason !== undefined || body.completed_declined_reason !== undefined ||
      body.withdrawn_reason !== undefined || body.reason_declined !== undefined || body.disqualify_reason !== undefined) {
    return 'reason';
  }

  // Notes change
  if (body.notes !== undefined) {
    return 'notes';
  }

  // Address fields
  const addressFields = ['address', 'street_address', 'city', 'state', 'postcode'];
  if (addressFields.some(f => body[f] !== undefined)) {
    return 'address';
  }

  // ICR/LVR
  if (body.icr !== undefined || body.lvr !== undefined) {
    return 'icr_lvr';
  }

  return 'opportunity';
}
