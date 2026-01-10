import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Fetch opportunity with organization filter
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any,
      organization_id: user.organisationId,
      deleted_at: null,
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Fetch client details
    const client = opportunity.client_id
      ? await db.collection(COLLECTIONS.CLIENTS).findOne({ _id: opportunity.client_id })
      : null;

    // Fetch organisation details
    const org = opportunity.organization_id
      ? await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: opportunity.organization_id })
      : null;

    // Fetch opportunity details
    const oppDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({
      opportunity_id: id
    });

    // Remove opportunity_id from details to avoid overwriting the real opportunity_id (CF10020)
    const details: any = oppDetails ? { ...oppDetails } : {};
    delete details.opportunity_id;

    // Fetch creator user details
    const creatorUser = opportunity.created_by
      ? await db.collection(COLLECTIONS.USERS).findOne(
          { _id: opportunity.created_by },
          { projection: { first_name: 1, surname: 1 } }
        )
      : null;

    // Format response - merge opportunity_details into main object
    const formattedOpportunity = {
      ...opportunity,
      id: opportunity._id,
      ...details,
      client_entity_name: client?.entity_name || '',
      client_contact_name: `${client?.contact_first_name || ''} ${client?.contact_last_name || ''}`.trim(),
      contact_first_name: client?.contact_first_name || '',
      contact_last_name: client?.contact_last_name || '',
      client_mobile: client?.contact_phone || '',
      client_email: client?.contact_email || '',
      client_abn: (client?.abn && client.abn.replace(/0/g, '') !== '') ? client.abn : '',
      client_time_in_business: opportunity.time_in_business || details.time_in_business || '',
      client_industry: opportunity.industry || '',
      client_address: details.client_address || details.address || '',
      client_brief_overview: details.brief_overview || '',
      referrer_group: org?.company_name || '',
      created_by_name: creatorUser ? `${creatorUser.first_name} ${creatorUser.surname}` : 'Unknown',
    };

    console.log('Referrer API - Returning opportunity with fields:', {
      entity_type: formattedOpportunity.entity_type,
      client_industry: formattedOpportunity.client_industry,
      industry: opportunity.industry,
      client_time_in_business: formattedOpportunity.client_time_in_business,
      client_address: formattedOpportunity.client_address,
      client_abn: formattedOpportunity.client_abn
    });

    // Remove MongoDB _id and nested objects to avoid duplication
    delete formattedOpportunity._id;
    delete formattedOpportunity.clients;
    delete formattedOpportunity.organisations;
    delete formattedOpportunity.opportunity_details;

    return NextResponse.json(formattedOpportunity);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
  }
}

// Referrers can edit draft opportunities fully, but only external_ref/created_by for submitted opportunities
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await getDatabase();

    // Verify opportunity belongs to this organization and get its status
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any
    });

    if (!opportunity || opportunity.organization_id !== user.organisationId) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const body = await request.json();
    const isDraft = opportunity.status === 'draft';

    // For draft opportunities, allow full editing
    if (isDraft) {
      const opportunitiesUpdateData: any = {};
      const detailsUpdateData: any = {};

      // Fields that can be updated on opportunities table for drafts
      const opportunitiesFields = [
        'entity_type', 'industry', 'time_in_business', 'abn',
        'loan_amount', 'property_value', 'loan_type', 'loan_purpose',
        'asset_type', 'asset_address', 'lender', 'lvr', 'icr',
        'status', 'created_by'
      ];

      // Fields that can be updated on opportunity_details table for drafts
      const detailsFields = [
        'address', 'street_address', 'city', 'state', 'postcode',
        'net_profit', 'ammortisation', 'deprecition', 'existing_interest_costs',
        'rental_expense', 'proposed_rental_income', 'existing_liabilities',
        'additional_property', 'smsf_structure', 'ato_liabilities', 'credit_file_issues',
        'term1', 'term2', 'term3', 'term4',
        'client_address', 'time_in_business', 'brief_overview',
        'outcome_level', 'additional_notes', 'rental_income'
      ];

      // Build opportunities update data
      for (const field of opportunitiesFields) {
        if (field in body) {
          opportunitiesUpdateData[field] = body[field] === '' ? null : body[field];
        }
      }

      // Build details update data
      for (const field of detailsFields) {
        if (field in body) {
          // Handle boolean fields - convert Yes/No to 1/0
          if (['existing_liabilities', 'additional_property', 'smsf_structure', 'ato_liabilities', 'credit_file_issues'].includes(field)) {
            const value = typeof body[field] === 'string' ? body[field].toLowerCase() : body[field];
            if (value === 'yes' || value === 1 || value === true) detailsUpdateData[field] = 1;
            else if (value === 'no' || value === 0 || value === false) detailsUpdateData[field] = 0;
            else detailsUpdateData[field] = null;
          } else {
            detailsUpdateData[field] = body[field] === '' ? null : body[field];
          }
        }
      }

      // Update opportunities collection
      if (Object.keys(opportunitiesUpdateData).length > 0) {
        const result = await db.collection(COLLECTIONS.OPPORTUNITIES).updateOne(
          { _id: id as any },
          { $set: opportunitiesUpdateData }
        );

        if (result.matchedCount === 0) {
          console.error('Error updating opportunity: No document matched');
          return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
        }
      }

      // Update opportunity_details collection
      if (Object.keys(detailsUpdateData).length > 0) {
        const existingDetails = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).findOne({
          opportunity_id: id
        });

        if (existingDetails) {
          await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).updateOne(
            { opportunity_id: id },
            { $set: detailsUpdateData }
          );
        } else {
          await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).insertOne({
            _id: new ObjectId().toString() as any,
            opportunity_id: id,
            ...detailsUpdateData,
            created_at: new Date().toISOString()
          });
        }
      }

      // Determine descriptive field_name for audit log
      const auditFieldName = determineAuditFieldName(body);

      // Log audit trail
      await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
        _id: new ObjectId().toString() as any,
        user_id: user.userId,
        table_name: 'opportunities',
        record_id: id,
        action: 'update',
        field_name: auditFieldName,
        new_value: JSON.stringify(body),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true });
    }

    // For non-draft opportunities, only allow external_ref and created_by updates
    const updateData: any = {};
    let auditFieldName = 'opportunity';

    if (body.external_ref !== undefined) {
      updateData.external_ref = body.external_ref;
      auditFieldName = 'external_ref';
    }
    if (body.created_by !== undefined) {
      // Verify the selected user belongs to the same organization
      const selectedUser = await db.collection(COLLECTIONS.USERS).findOne({
        _id: body.created_by
      });

      if (selectedUser && selectedUser.organisation_id === user.organisationId) {
        updateData.created_by = body.created_by;
        auditFieldName = auditFieldName === 'external_ref' ? 'external_ref' : 'team_member';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update opportunity
    const result = await db.collection(COLLECTIONS.OPPORTUNITIES).updateOne(
      { _id: id as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.error('Error updating opportunity: No document matched');
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
    }

    // Log audit trail
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: new ObjectId().toString() as any,
      user_id: user.userId,
      table_name: 'opportunities',
      record_id: id,
      action: 'update',
      field_name: auditFieldName,
      new_value: JSON.stringify(updateData),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}

// Helper function to determine a descriptive field name for audit logging
function determineAuditFieldName(body: any): string {
  // Check for status change
  if (body.status !== undefined) {
    return 'status_change';
  }

  // Check for external reference
  if (body.external_ref !== undefined) {
    return 'external_ref';
  }

  // Check for team member change
  if (body.created_by !== undefined) {
    return 'team_member';
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

  // ICR/LVR
  if (body.icr !== undefined || body.lvr !== undefined) {
    return 'icr_lvr';
  }

  // Address fields
  const addressFields = ['address', 'street_address', 'city', 'state', 'postcode'];
  if (addressFields.some(f => body[f] !== undefined)) {
    return 'address';
  }

  return 'draft_update';
}
