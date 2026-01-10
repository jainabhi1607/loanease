import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { ObjectId } from 'mongodb';
import { sendNewOpportunityAlert, sendOpportunityConfirmationToReferrer, sendOpportunityConfirmationToClient } from '@/lib/email/postmark';
import { formatCurrency, formatAssetType, formatLoanType, formatLoanPurpose } from '@/lib/opportunity-utils';

// Helper function to safely parse currency strings to numbers
function parseCurrency(value: string | null | undefined): number | null {
  if (!value || value === '' || value.trim() === '') return null;
  const cleaned = value.replace(/[$,]/g, '').trim();
  if (cleaned === '') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a referrer (referrer_admin or referrer_team)
    if (user.role !== 'referrer_admin' && user.role !== 'referrer_team') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!user.organisationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const db = await getDatabase();

    const body = await request.json();
    console.log('Referrer create API - Received body:', JSON.stringify(body, null, 2));

    const {
      referrer_user_id,
      client_type,
      selected_client_id,
      new_client_data,
      brief_overview,
      has_more_info,
      loan_amount,
      estimated_property_value,
      loan_type,
      loan_purpose,
      asset_type,
      asset_address,
      financial_details,
      icr,
      lvr,
      outcome_level,
      additional_notes,
      terms_accepted,
      status // 'draft' or 'opportunity'
    } = body;

    console.log('Referrer create API - Parsed new_client_data:', new_client_data);

    // Validate referrer user selection
    if (!referrer_user_id) {
      return NextResponse.json({ error: 'Referrer user selection is required' }, { status: 400 });
    }

    // Verify the selected user belongs to the same organization
    const selectedUser = await db.collection(COLLECTIONS.USERS).findOne({
      _id: referrer_user_id
    });

    if (!selectedUser || selectedUser.organisation_id !== user.organisationId) {
      return NextResponse.json({ error: 'Invalid user selection' }, { status: 400 });
    }

    // Step 1: Handle client creation or selection
    let clientId = selected_client_id;

    if (client_type === 'new' && new_client_data) {
      // Convert entity type string to integer (1=Private company, 2=Sole trader, 3=SMSF Trust, 4=Trust, 5=Partnership, 6=Individual)
      const entityTypeMap: Record<string, number> = {
        'private_company': 1,
        'sole_trader': 2,
        'smsf_trust': 3,
        'trust': 4,
        'partnership': 5,
        'individual': 6
      };
      const entityTypeInt = new_client_data.entityType ? entityTypeMap[new_client_data.entityType] || null : null;

      // Check if a client with this ABN already exists for this organization
      const abnToCheck = new_client_data.abn || '00000000000';
      const existingClient = await db.collection(COLLECTIONS.CLIENTS).findOne({
        organisation_id: user.organisationId,
        abn: abnToCheck
      });

      if (existingClient) {
        // Use existing client
        console.log('Client with ABN already exists, using existing client:', existingClient._id);
        clientId = existingClient._id;
      } else {
        // Create new client - note: address, time_in_business, industry are on opportunities/opportunity_details, not clients
        const newClientId = new ObjectId().toString();
        const clientData = {
          _id: newClientId,
          organisation_id: user.organisationId,
          abn: abnToCheck,
          contact_first_name: new_client_data.firstName,
          contact_last_name: new_client_data.lastName,
          entity_name: new_client_data.entityName || `${new_client_data.firstName} ${new_client_data.lastName}`,
          contact_phone: new_client_data.mobile,
          contact_email: new_client_data.email,
          entity: entityTypeInt,
          created_by: user.userId,
          created_at: new Date().toISOString()
        };

        console.log('Attempting to create client with data:', clientData);

        const clientResult = await db.collection(COLLECTIONS.CLIENTS).insertOne(clientData as any);

        if (!clientResult.insertedId) {
          console.error('Error creating client: Insert failed');
          return NextResponse.json({
            error: 'Failed to create client',
            details: 'Insert operation did not return an ID'
          }, { status: 500 });
        }

        console.log('Client created successfully:', newClientId);
        clientId = newClientId;

        // Log audit trail for client creation
        await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
          _id: new ObjectId().toString() as any,
          user_id: user.userId,
          table_name: 'clients',
          record_id: newClientId,
          action: 'create',
          field_name: 'client',
          new_value: JSON.stringify(clientData),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          created_at: new Date().toISOString()
        });
      }
    }

    // Step 2: Generate next opportunity_id manually to avoid conflicts
    const maxIdResults = await db.collection(COLLECTIONS.OPPORTUNITIES)
      .find({ opportunity_id: { $regex: /^CF/ } })
      .sort({ opportunity_id: -1 })
      .limit(100)
      .toArray();

    let nextNumber = 10001; // Start from CF10001
    if (maxIdResults && maxIdResults.length > 0) {
      // Find the highest number from all CF IDs
      const numbers = maxIdResults
        .map((r: any) => {
          const match = r.opportunity_id?.match(/CF(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => !isNaN(n));
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    const nextOpportunityId = `CF${nextNumber}`;
    console.log('Generated next opportunity_id:', nextOpportunityId);

    // Create opportunity
    const opportunityId = new ObjectId().toString();
    const opportunityData: any = {
      _id: opportunityId,
      opportunity_id: nextOpportunityId, // Explicitly set to avoid trigger conflicts
      organization_id: user.organisationId, // Use user's organization
      client_id: clientId,
      created_by: referrer_user_id, // Use selected referrer user
      status: status || 'opportunity', // 'draft' for Save & Return, 'opportunity' for Save & Submit
      created_at: new Date().toISOString(),
      deleted_at: null
    };

    // Add client-related fields to opportunities table if new client
    if (client_type === 'new' && new_client_data) {
      console.log('Saving client data to opportunity:', {
        entityType: new_client_data.entityType,
        industry: new_client_data.industry,
        timeInBusiness: new_client_data.timeInBusiness,
        abn: new_client_data.abn,
        companyAddress: new_client_data.companyAddress
      });
      opportunityData.entity_type = new_client_data.entityType || null;
      opportunityData.industry = new_client_data.industry || null;
      opportunityData.time_in_business = new_client_data.timeInBusiness || null;
      opportunityData.abn = new_client_data.abn || null;
    }

    // Add detailed information if provided
    if (has_more_info) {
      opportunityData.loan_amount = parseCurrency(loan_amount);
      opportunityData.property_value = parseCurrency(estimated_property_value);
      opportunityData.loan_purpose = loan_purpose || null;
      opportunityData.loan_type = loan_type || null;
      opportunityData.asset_type = asset_type || null;
      opportunityData.asset_address = asset_address || null;
      opportunityData.lvr = typeof lvr === 'number' ? lvr : null;
      opportunityData.icr = typeof icr === 'number' ? icr : null;

      console.log('Loan details being saved to opportunities:', {
        loan_amount: opportunityData.loan_amount,
        property_value: opportunityData.property_value,
        loan_purpose: opportunityData.loan_purpose,
        loan_type: opportunityData.loan_type,
        lvr: opportunityData.lvr,
        icr: opportunityData.icr
      });
    }

    const opportunityResult = await db.collection(COLLECTIONS.OPPORTUNITIES).insertOne(opportunityData);

    if (!opportunityResult.insertedId) {
      console.error('Error creating opportunity: Insert failed');
      console.error('Opportunity data that failed:', JSON.stringify(opportunityData, null, 2));
      return NextResponse.json({
        error: 'Failed to create opportunity',
        details: 'Insert operation did not return an ID'
      }, { status: 500 });
    }

    // Step 3: Create opportunity_details record
    const detailsId = new ObjectId().toString();
    const detailsData: any = {
      _id: detailsId,
      opportunity_id: opportunityId,
      client_address: new_client_data?.companyAddress || null,
      time_in_business: new_client_data?.timeInBusiness || null,
      brief_overview: brief_overview || null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      created_at: new Date().toISOString()
    };

    console.log('Creating opportunity_details with:', {
      opportunity_id: opportunityId,
      client_address: detailsData.client_address,
      time_in_business: detailsData.time_in_business,
      brief_overview: detailsData.brief_overview
    });

    // Add detailed info if provided
    if (has_more_info) {
      // Address fields
      detailsData.address = asset_address || null;

      // Financial details - always process if financial_details object exists
      if (financial_details) {
        console.log('Processing financial_details:', JSON.stringify(financial_details, null, 2));

        // Save "funded from rental" field - convert yes/no to Yes/No for consistency with admin display
        detailsData.rental_income = financial_details.fundedFromRental === 'yes' ? 'Yes' : (financial_details.fundedFromRental === 'no' ? 'No' : null);

        // Parse all currency fields using the safe helper function
        detailsData.net_profit = parseCurrency(financial_details.netProfitBeforeTax);
        detailsData.ammortisation = parseCurrency(financial_details.amortisation);
        detailsData.deprecition = parseCurrency(financial_details.depreciation);
        detailsData.existing_interest_costs = parseCurrency(financial_details.existingInterestCosts);
        detailsData.rental_expense = parseCurrency(financial_details.rentalExpense);
        detailsData.proposed_rental_income = parseCurrency(financial_details.proposedRentalIncome);

        // Boolean fields (yes/no to 1/0)
        detailsData.existing_liabilities = financial_details.existingLiabilities === 'yes' ? 1 : (financial_details.existingLiabilities === 'no' ? 0 : null);
        detailsData.additional_property = financial_details.additionalSecurity === 'yes' ? 1 : (financial_details.additionalSecurity === 'no' ? 0 : null);
        detailsData.smsf_structure = financial_details.smsf === 'yes' ? 1 : (financial_details.smsf === 'no' ? 0 : null);
        detailsData.ato_liabilities = financial_details.existingATO === 'yes' ? 1 : (financial_details.existingATO === 'no' ? 0 : null);
        detailsData.credit_file_issues = financial_details.creditIssues === 'yes' ? 1 : (financial_details.creditIssues === 'no' ? 0 : null);

        console.log('Financial details being saved to opportunity_details:', {
          rental_income: detailsData.rental_income,
          net_profit: detailsData.net_profit,
          ammortisation: detailsData.ammortisation,
          deprecition: detailsData.deprecition,
          existing_interest_costs: detailsData.existing_interest_costs,
          rental_expense: detailsData.rental_expense,
          proposed_rental_income: detailsData.proposed_rental_income,
          existing_liabilities: detailsData.existing_liabilities,
          additional_property: detailsData.additional_property,
          smsf_structure: detailsData.smsf_structure,
          ato_liabilities: detailsData.ato_liabilities,
          credit_file_issues: detailsData.credit_file_issues
        });
      }

      // Outcome and notes
      detailsData.outcome_level = outcome_level || null;
      detailsData.additional_notes = additional_notes || null;
    }

    // Add terms acceptance if provided
    if (terms_accepted) {
      detailsData.term1 = terms_accepted.term1 ? 1 : 0;
      detailsData.term2 = terms_accepted.term2 ? 1 : 0;
      detailsData.term3 = terms_accepted.term3 ? 1 : 0;
      detailsData.term4 = terms_accepted.term4 ? 1 : 0;
    }

    console.log('Final detailsData being inserted:', JSON.stringify(detailsData, null, 2));

    const detailsResult = await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).insertOne(detailsData);

    if (!detailsResult.insertedId) {
      console.error('Error creating opportunity details: Insert failed');
      console.error('Details data that failed:', JSON.stringify(detailsData, null, 2));
      // Don't fail the whole operation, just log the error
      console.warn('Opportunity created but details failed to save');
    } else {
      console.log('Opportunity details saved successfully');
    }

    // Step 4: Log audit trail for opportunity creation
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: new ObjectId().toString() as any,
      user_id: user.userId,
      table_name: 'opportunities',
      record_id: opportunityId,
      action: 'create',
      field_name: 'opportunity',
      new_value: JSON.stringify(opportunityData),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    });

    // Step 5: Create initial comment
    await db.collection(COLLECTIONS.COMMENTS).insertOne({
      _id: new ObjectId().toString() as any,
      opportunity_id: opportunityId,
      user_id: user.userId,
      comment: 'Opportunity created by referrer.',
      is_public: false,
      created_at: new Date().toISOString()
    });

    // Step 6: Send opportunity alert emails (only for submitted opportunities, not drafts)
    if (status === 'opportunity') {
      try {
        // Fetch common data needed for all emails
        const org = await db.collection(COLLECTIONS.ORGANISATIONS).findOne({
          _id: user.organisationId as any
        });

        const referrerUserData = await db.collection(COLLECTIONS.USERS).findOne({
          _id: referrer_user_id as any
        });

        console.log('Referrer user data for email:', referrerUserData);

        const clientData = await db.collection(COLLECTIONS.CLIENTS).findOne({
          _id: clientId as any
        });

        // Send admin alert emails
        const alertSetting = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).findOne({
          key: 'opportunity_alert_emails'
        });

        if (alertSetting?.value) {
          const emails = alertSetting.value
            .split('\n')
            .map((email: string) => email.trim())
            .filter((email: string) => email && email.includes('@'));

          const alertDetails = {
            opportunityId: nextOpportunityId,
            borrowerEntityName: clientData?.entity_name || '',
            borrowerEmail: clientData?.contact_email || '',
            referrerEntity: org?.company_name || '',
            referrerEmail: referrerUserData?.email || '',
            assetType: formatAssetType(asset_type),
            loanAmount: formatCurrency(parseCurrency(loan_amount) || undefined),
            loanType: formatLoanType(loan_type),
            loanPurpose: formatLoanPurpose(loan_purpose),
            icr: icr ? `${icr.toFixed(2)}` : '-',
            lvr: lvr ? `${lvr.toFixed(2)}%` : '-',
          };

          await Promise.all(
            emails.map((email: string) => sendNewOpportunityAlert(email, alertDetails))
          );
        }

        // Send confirmation email to referrer
        if (referrerUserData?.email) {
          const referrerName = referrerUserData
            ? `${referrerUserData.first_name || ''} ${referrerUserData.surname || ''}`.trim()
            : 'Referrer';

          await sendOpportunityConfirmationToReferrer({
            referrerEmail: referrerUserData.email,
            referrerName: referrerName || 'Referrer',
            entityName: clientData?.entity_name || 'your client',
          });
          console.log('Sent opportunity confirmation email to referrer:', referrerUserData.email);
        }

        // Send confirmation email to client
        if (clientData?.contact_email) {
          const clientName = clientData
            ? `${clientData.contact_first_name || ''} ${clientData.contact_last_name || ''}`.trim()
            : 'Client';

          await sendOpportunityConfirmationToClient({
            clientEmail: clientData.contact_email,
            clientName: clientName || 'Client',
            entityName: clientData?.entity_name || 'your application',
          });
          console.log('Sent opportunity confirmation email to client:', clientData.contact_email);
        }
      } catch (emailError) {
        console.error('Error sending opportunity alert emails:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunityId,
        opportunity_id: nextOpportunityId,
        client_id: clientId
      }
    });

  } catch (error) {
    console.error('Error in referrer create opportunity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
