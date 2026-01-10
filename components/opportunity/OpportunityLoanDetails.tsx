'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';

interface OpportunityLoanDetailsProps {
  opportunity: any;
  formatCurrency: (amount?: number) => string;
  formatAssetType: (type?: string) => string;
  formatLoanType: (type?: string) => string;
  formatLoanPurpose: (purpose?: string) => string;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function OpportunityLoanDetails({
  opportunity,
  formatCurrency,
  formatAssetType,
  formatLoanType,
  formatLoanPurpose,
  canEdit = false,
  onEdit
}: OpportunityLoanDetailsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Loan Details</CardTitle>
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Edit loan details"
          >
            <Pencil className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Type of asset</p>
            <p className="font-medium">{formatAssetType(opportunity.asset_type)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Asset Address</p>
            <p className="font-medium">{opportunity.asset_address || '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Loan Amount</p>
            <p className="font-medium">{formatCurrency(opportunity.loan_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimated property value</p>
            <p className="font-medium">{formatCurrency(opportunity.property_value)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Loan Type</p>
            <p className="font-medium">{formatLoanType(opportunity.loan_type)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Loan Purpose</p>
            <p className="font-medium">{formatLoanPurpose(opportunity.loan_purpose)}</p>
          </div>
        </div>

        {opportunity.lender && (
          <div>
            <p className="text-sm text-gray-500">Lender</p>
            <p className="font-medium">{opportunity.lender}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
