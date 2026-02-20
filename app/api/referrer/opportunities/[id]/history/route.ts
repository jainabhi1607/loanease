import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth/session';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user is authenticated
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

    // Verify the opportunity belongs to the referrer's organisation
    const opportunity = await db.collection(COLLECTIONS.OPPORTUNITIES).findOne({
      _id: id as any,
      organization_id: user.organisationId,
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Fetch audit logs for this opportunity
    const auditLogs = await db.collection(COLLECTIONS.AUDIT_LOGS)
      .find({
        record_id: id,
        table_name: 'opportunities',
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get unique user IDs from audit logs
    const userIds = [...new Set(auditLogs.map((log: any) => log.user_id).filter(Boolean))];

    // Fetch user details
    let usersMap: Record<string, { first_name: string; surname: string }> = {};
    if (userIds.length > 0) {
      const users = await db.collection(COLLECTIONS.USERS)
        .find({ _id: { $in: userIds } })
        .project({ _id: 1, first_name: 1, surname: 1 })
        .toArray();

      usersMap = users.reduce((acc: any, u: any) => {
        acc[u._id] = { first_name: u.first_name, surname: u.surname };
        return acc;
      }, {});
    }

    // Transform audit logs into history entries
    const history = auditLogs.map((log: any) => {
      const logUser = log.user_id ? usersMap[log.user_id] : null;
      const userName = logUser ? `${logUser.first_name} ${logUser.surname}`.trim() : 'System';

      // Generate description based on action and field
      const description = generateDescription(log.action, log.field_name, log.old_value, log.new_value);

      return {
        id: log._id,
        date: log.created_at,
        time: formatTime(log.created_at),
        action: log.action,
        field_name: log.field_name,
        old_value: log.old_value,
        new_value: log.new_value,
        description,
        user_name: userName,
        ip_address: log.ip_address || '-',
      };
    });

    return NextResponse.json({ history });

  } catch (error) {
    console.error('Error in opportunity history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
}

function generateDescription(action: string, fieldName: string | null, oldValue: any, newValue: any): string {
  // Parse new_value if it's a stringified JSON
  let parsedNew = newValue;
  if (typeof newValue === 'string') {
    try {
      parsedNew = JSON.parse(newValue);
    } catch {
      parsedNew = newValue;
    }
  }

  // Handle different action types
  switch (action) {
    case 'create':
      return 'Opportunity Created';
    case 'delete':
      return 'Opportunity Deleted';
    case 'finalise_complete':
      return 'Deal Finalisation Info completed.';
    case 'update':
      return formatUpdateDescription(fieldName, parsedNew);
    default:
      return `${action.charAt(0).toUpperCase() + action.slice(1)}`;
  }
}

function formatUpdateDescription(fieldName: string | null, newValue: any): string {
  if (!fieldName && typeof newValue === 'object') {
    // Multiple fields were updated - create a summary
    const changes: string[] = [];

    // Check for unqualified status change first (highest priority)
    if (newValue.is_unqualified !== undefined) {
      if (newValue.is_unqualified === 1 || newValue.is_unqualified === '1' || newValue.is_unqualified === 'yes') {
        const reason = newValue.unqualified_reason ? `: ${newValue.unqualified_reason}` : '';
        return `Marked as Unqualified${reason}`;
      } else {
        return 'Removed Unqualified Status';
      }
    }

    // Check for status change
    if (newValue.status) {
      const statusDesc = formatStatusChange(newValue.status, newValue);
      return statusDesc;
    }

    // Check for target settlement date
    if (newValue.target_settlement_date !== undefined) {
      if (newValue.target_settlement_date) {
        changes.push(`Target Settlement set to ${formatDateShort(newValue.target_settlement_date)}`);
      } else {
        changes.push('Target Settlement Date cleared');
      }
    }

    // Check for date settled
    if (newValue.date_settled !== undefined) {
      if (newValue.date_settled) {
        changes.push(`Date Settled set to ${formatDateShort(newValue.date_settled)}`);
      } else {
        changes.push('Date Settled cleared');
      }
    }

    // Check for external reference
    if (newValue.external_ref !== undefined) {
      if (newValue.external_ref) {
        changes.push(`External Ref set to "${newValue.external_ref}"`);
      } else {
        changes.push('External Ref cleared');
      }
    }

    // Check for team member change
    if (newValue.created_by !== undefined) {
      changes.push('Team Member changed');
    }

    // Check for lender change
    if (newValue.lender !== undefined) {
      if (newValue.lender) {
        changes.push(`Lender set to "${newValue.lender}"`);
      } else {
        changes.push('Lender cleared');
      }
    }

    // Client details changes
    const clientFields = ['entity_type', 'industry', 'time_in_business', 'abn', 'client_address', 'brief_overview'];
    const clientChanges = clientFields.filter(f => newValue[f] !== undefined);
    if (clientChanges.length > 0) {
      changes.push('Client Details updated');
    }

    // Loan details changes
    const loanFields = ['loan_amount', 'property_value', 'loan_type', 'loan_purpose', 'asset_type', 'asset_address'];
    const loanChanges = loanFields.filter(f => newValue[f] !== undefined);
    if (loanChanges.length > 0) {
      changes.push('Loan Details updated');
    }

    // Financial details changes
    const financialFields = ['net_profit', 'ammortisation', 'deprecition', 'existing_interest_costs',
      'rental_expense', 'proposed_rental_income', 'existing_liabilities', 'additional_property',
      'smsf_structure', 'ato_liabilities', 'credit_file_issues', 'rental_income'];
    const financialChanges = financialFields.filter(f => newValue[f] !== undefined);
    if (financialChanges.length > 0) {
      changes.push('Financial Details updated');
    }

    // ICR/LVR changes
    if (newValue.icr !== undefined || newValue.lvr !== undefined) {
      changes.push('ICR/LVR recalculated');
    }

    // Payment info changes
    if (newValue.payment_received_date !== undefined || newValue.payment_amount !== undefined) {
      changes.push('Payment Info updated');
    }

    // Loan account reference
    if (newValue.loan_acc_ref_no !== undefined || newValue.flex_id !== undefined) {
      changes.push('Loan Reference updated');
    }

    // Declined/withdrawn reasons
    if (newValue.declined_reason !== undefined || newValue.completed_declined_reason !== undefined) {
      changes.push('Declined Reason added');
    }
    if (newValue.withdrawn_reason !== undefined) {
      changes.push('Withdrawn Reason added');
    }
    if (newValue.reason_declined !== undefined || newValue.disqualify_reason !== undefined) {
      changes.push('Reason updated');
    }

    // Notes change
    if (newValue.notes !== undefined) {
      changes.push('Notes updated');
    }

    // Address fields
    const addressFields = ['address', 'street_address', 'city', 'state', 'postcode'];
    const addressChanges = addressFields.filter(f => newValue[f] !== undefined);
    if (addressChanges.length > 0 && !clientChanges.length) {
      changes.push('Address updated');
    }

    // If we have specific changes, return them
    if (changes.length > 0) {
      // Limit to 3 items for readability
      if (changes.length <= 3) {
        return changes.join(', ');
      }
      return `${changes.slice(0, 2).join(', ')} (+${changes.length - 2} more)`;
    }

    // Fallback: count fields
    const fields = Object.keys(newValue);
    if (fields.length === 1) {
      return `${formatFieldName(fields[0])} updated`;
    }
    return `${fields.length} fields updated`;
  }

  // Handle specific field names from audit log
  if (fieldName) {
    switch (fieldName) {
      case 'draft_update':
        return 'Draft updated';
      case 'external_ref':
        return 'External Ref updated';
      case 'team_member':
        return 'Team Member changed';
      case 'deleted_at':
        return 'Opportunity Deleted';
      case 'unqualified_status':
        // Parse newValue for more detail
        if (typeof newValue === 'object') {
          if (newValue.is_unqualified === 1 || newValue.is_unqualified === '1') {
            const reason = newValue.unqualified_reason ? `: ${newValue.unqualified_reason}` : '';
            return `Marked as Unqualified${reason}`;
          }
          return 'Removed Unqualified Status';
        }
        return 'Unqualified Status updated';
      case 'status_change':
        if (typeof newValue === 'object' && newValue.status) {
          return formatStatusChange(newValue.status, newValue);
        }
        return 'Status changed';
      case 'target_settlement':
        if (typeof newValue === 'object' && newValue.target_settlement_date) {
          return `Target Settlement set to ${formatDateShort(newValue.target_settlement_date)}`;
        }
        return 'Target Settlement Date updated';
      case 'date_settled':
        if (typeof newValue === 'object' && newValue.date_settled) {
          return `Date Settled set to ${formatDateShort(newValue.date_settled)}`;
        }
        return 'Date Settled updated';
      case 'lender':
        if (typeof newValue === 'object' && newValue.lender) {
          return `Lender set to "${newValue.lender}"`;
        }
        return 'Lender updated';
      case 'client_details':
        return 'Client Details updated';
      case 'loan_details':
        return 'Loan Details updated';
      case 'financial_details':
        return 'Financial Details updated';
      case 'payment_info':
        return 'Payment Info updated';
      case 'loan_reference':
        return 'Loan Reference updated';
      case 'reason':
        return 'Reason updated';
      case 'notes':
        return 'Notes updated';
      case 'address':
        return 'Address updated';
      case 'icr_lvr':
        return 'ICR/LVR recalculated';
      default:
        return `${formatFieldName(fieldName)} updated`;
    }
  }

  return 'Opportunity Updated';
}

function formatStatusChange(status: string, data: any): string {
  const statusLabel = formatStatus(status);

  switch (status) {
    case 'declined':
      const declineReason = data.declined_reason || data.completed_declined_reason || data.reason_declined;
      if (declineReason) {
        return `Status changed to ${statusLabel}: ${declineReason}`;
      }
      return `Status changed to ${statusLabel}`;
    case 'withdrawn':
      if (data.withdrawn_reason) {
        return `Status changed to ${statusLabel}: ${data.withdrawn_reason}`;
      }
      return `Status changed to ${statusLabel}`;
    case 'settled':
      return `Status changed to ${statusLabel}`;
    default:
      return `Status changed to ${statusLabel}`;
  }
}

function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function formatFieldName(field: string): string {
  // Convert snake_case to Title Case
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'Draft',
    'opportunity': 'Lead',
    'application_created': 'Application Created',
    'application_submitted': 'Application Submitted',
    'conditionally_approved': 'Conditionally Approved',
    'approved': 'Approved',
    'declined': 'Declined',
    'settled': 'Settled',
    'withdrawn': 'Withdrawn',
  };
  return statusMap[status] || status;
}
