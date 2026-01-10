import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';
import { sendNewOpportunityAlert, sendOpportunityConfirmationToReferrer, sendOpportunityConfirmationToClient } from '@/lib/email/postmark';
import { formatCurrency, formatAssetType, formatLoanType, formatLoanPurpose } from '@/lib/opportunity-utils';
import { v4 as uuidv4 } from 'uuid';

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

    // Check user role
    if (user.role !== 'super_admin' && user.role !== 'admin_team') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      referrer_id,
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

    const db = await getDatabase();

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
        organisation_id: referrer_id,
        abn: abnToCheck
      });

      if (existingClient) {
        // Use existing client
        console.log('Client with ABN already exists, using existing client:', existingClient._id);
        clientId = existingClient._id;
      } else {
        // Create new client - note: time_in_business, industry, address are on opportunities/opportunity_details, not clients
        const newClientId = uuidv4();
        const clientData = {
          _id: newClientId,
          organisation_id: referrer_id,
          entity: entityTypeInt,
          entity_name: new_client_data.entityName || `${new_client_data.firstName} ${new_client_data.lastName}`,
          contact_first_name: new_client_data.firstName,
          contact_last_name: new_client_data.lastName,
          contact_phone: new_client_data.mobile,
          contact_email: new_client_data.email,
          abn: abnToCheck,
          created_by: user.userId,
          created_at: new Date()
        };

        console.log('Attempting to create client with data:', clientData);

        await db.collection(COLLECTIONS.CLIENTS).insertOne(clientData as any);

        console.log('Client created successfully:', newClientId);

        clientId = newClientId;

        // Log audit trail for client creation
        await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
          _id: uuidv4() as any,
          user_id: user.userId,
          table_name: 'clients',
          record_id: newClientId,
          action: 'create',
          field_name: 'client',
          new_value: JSON.stringify(clientData),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          created_at: new Date()
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
    console.log('Admin Create - Generated next opportunity_id:', nextOpportunityId);

    // Create opportunity
    const opportunityId = uuidv4();
    const opportunityData: any = {
      _id: opportunityId,
      opportunity_id: nextOpportunityId, // Explicitly set to avoid trigger conflicts
      organization_id: referrer_id, // Note: opportunities table uses American spelling
      client_id: clientId,
      created_by: referrer_user_id, // Use the selected referrer user, not the admin creating it
      status: status || 'opportunity', // 'draft' for Save & Return, 'opportunity' for Save & Submit
      created_at: new Date(),
      deleted_at: null
    };

    // Add client-related fields to opportunities table if new client
    if (client_type === 'new' && new_client_data) {
      console.log('CREATE API - Saving client fields to opportunity:', {
        entityType: new_client_data.entityType,
        industry: new_client_data.industry,
        timeInBusiness: new_client_data.timeInBusiness,
        abn: new_client_data.abn
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

      console.log('Admin Create - Loan details being saved to opportunities:', {
        loan_amount: opportunityData.loan_amount,
        property_value: opportunityData.property_value,
        loan_purpose: opportunityData.loan_purpose,
        loan_type: opportunityData.loan_type,
        lvr: opportunityData.lvr,
        icr: opportunityData.icr
      });
    }

    await db.collection(COLLECTIONS.OPPORTUNITIES).insertOne(opportunityData);

    // Step 2.5: Create opportunity_details record (always create, even for minimal info)
    const detailsData: any = {
      _id: uuidv4() as any,
      opportunity_id: opportunityId,
      client_address: new_client_data?.companyAddress || null,
      time_in_business: new_client_data?.timeInBusiness || null,
      brief_overview: brief_overview || null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      created_at: new Date()
    };

    // Add detailed info if provided
    if (has_more_info) {
      // Address fields
      detailsData.address = asset_address || null;

      // Financial details - field names match the form: fundedFromRental, netProfitBeforeTax, etc.
      if (financial_details) {
        console.log('Admin Create - Processing financial_details:', JSON.stringify(financial_details, null, 2));

        // Save "funded from rental" field - convert yes/no to Yes/No for consistency with display
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

        console.log('Admin Create - Financial details being saved to opportunity_details:', {
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

    console.log('Admin Create - Final detailsData being inserted:', JSON.stringify(detailsData, null, 2));

    try {
      await db.collection(COLLECTIONS.OPPORTUNITY_DETAILS).insertOne(detailsData);
      console.log('Admin Create - Opportunity details saved successfully');
    } catch (detailsError) {
      console.error('Error creating opportunity details:', detailsError);
      // Don't fail the whole operation, just log the error
      console.warn('Opportunity created but details failed to save');
    }

    // Step 3: Log audit trail for opportunity creation
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      _id: uuidv4() as any,
      user_id: user.userId,
      table_name: 'opportunities',
      record_id: opportunityId,
      action: 'create',
      field_name: 'opportunity',
      new_value: JSON.stringify(opportunityData),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date()
    });

    // Step 4: Create initial comment
    await db.collection(COLLECTIONS.COMMENTS).insertOne({
      _id: uuidv4() as any,
      opportunity_id: opportunityId,
      user_id: user.userId,
      comment: 'Opportunity created.',
      is_public: false,
      created_at: new Date()
    });

    // Step 5: Send opportunity alert emails (only for submitted opportunities, not drafts)
    if (status === 'opportunity') {
      try {
        // Fetch common data needed for all emails
        const orgData = await db.collection(COLLECTIONS.ORGANISATIONS).findOne({ _id: referrer_id as any });

        const referrerUserData = await db.collection(COLLECTIONS.USERS).findOne({ _id: referrer_user_id as any });

        console.log('Referrer user data for email:', referrerUserData);

        const clientData = await db.collection(COLLECTIONS.CLIENTS).findOne({ _id: clientId as any });

        // Send admin alert emails
        const alertSetting = await db.collection(COLLECTIONS.GLOBAL_SETTINGS).findOne({ key: 'opportunity_alert_emails' });

        if (alertSetting?.value) {
          const emails = alertSetting.value
            .split('\n')
            .map((email: string) => email.trim())
            .filter((email: string) => email && email.includes('@'));

          const alertDetails = {
            opportunityId: nextOpportunityId,
            borrowerEntityName: clientData?.entity_name || '',
            borrowerEmail: clientData?.contact_email || '',
            referrerEntity: orgData?.company_name || '',
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
    console.error('Error in create opportunity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
