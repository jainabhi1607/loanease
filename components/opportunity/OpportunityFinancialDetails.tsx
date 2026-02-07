'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, ThumbsUp } from 'lucide-react';

// Normalize risk indicator: handles 0/1, "yes"/"no", "0"/"1", true/false
const formatRiskIndicator = (val: any): string => {
  if (val === null || val === undefined) return '-';
  if (val === 1 || val === '1' || val === true || (typeof val === 'string' && val.toLowerCase() === 'yes')) return 'Yes';
  if (val === 0 || val === '0' || val === false || (typeof val === 'string' && val.toLowerCase() === 'no')) return 'No';
  return '-';
};

// Check if risk indicator is "No" (handles 0, '0', 'No', 'no', false)
const isRiskNo = (val: any): boolean => {
  if (val === 0 || val === '0' || val === false) return true;
  if (typeof val === 'string' && val.toLowerCase() === 'no') return true;
  return false;
};

interface OpportunityFinancialDetailsProps {
  opportunity: any;
  formatCurrency: (amount?: number) => string;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function OpportunityFinancialDetails({
  opportunity,
  formatCurrency,
  canEdit = false,
  onEdit
}: OpportunityFinancialDetailsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Details</CardTitle>
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Edit financial details"
          >
            <Pencil className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-gray-500 mb-3">Will the property be funded solely from rental income?</p>
          <p className="font-medium">{opportunity.rental_income || 'No'}</p>
        </div>

        {opportunity.rental_income !== 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Proposed Rental Income (Annual)</p>
                <p className="font-medium">{formatCurrency(opportunity.proposed_rental_income)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-3">Financial Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Net Profit Before Tax</p>
                  <p className="font-medium">{formatCurrency(opportunity.net_profit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amortisation</p>
                  <p className="font-medium">{formatCurrency(opportunity.ammortisation)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Depreciation</p>
                  <p className="font-medium">{formatCurrency(opportunity.deprecition)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Existing Interest Costs</p>
                  <p className="font-medium">{formatCurrency(opportunity.existing_interest_costs)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Rental Expense</p>
                  <p className="font-medium">{formatCurrency(opportunity.rental_expense)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700 mb-3">Calculated Ratios</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ICR</p>
              <p className="font-medium">{opportunity.icr?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">LVR</p>
              <p className="font-medium">{opportunity.lvr?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700 mb-3">Additional Information</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Does your business and/or the borrowing entity have any existing liabilities?</p>
              <p className="font-medium">{formatRiskIndicator(opportunity.existing_liabilities)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Are you looking to offer up additional property security to support your equity position?</p>
              <p className="font-medium">{formatRiskIndicator(opportunity.additional_security ?? opportunity.additional_property)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Is the application an SMSF structure?</p>
              <p className="font-medium">{formatRiskIndicator(opportunity.smsf_structure)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Do you have any existing or overdue ATO / tax liabilities?</p>
              <p className="font-medium">{formatRiskIndicator(opportunity.ato_liabilities)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Do you have any credit file issues e.g. paid or unpaid defaults?</p>
              <p className="font-medium">{formatRiskIndicator(opportunity.credit_issues ?? opportunity.credit_file_issues)}</p>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        {opportunity.additional_notes && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-3">Additional Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{opportunity.additional_notes}</p>
          </div>
        )}

        {/* Outcome Assessment */}
        {opportunity.icr && opportunity.lvr && (
          <div className={`p-4 rounded-lg ${
            opportunity.icr >= 2 && opportunity.lvr <= 65 &&
            isRiskNo(opportunity.existing_liabilities) &&
            isRiskNo(opportunity.ato_liabilities) &&
            isRiskNo(opportunity.credit_issues ?? opportunity.credit_file_issues)
              ? 'bg-gradient-to-br from-green-50 to-green-100'
              : opportunity.icr >= 2 && opportunity.lvr <= 80
              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100'
              : 'bg-gradient-to-br from-red-50 to-red-100'
          }`}>
            <div className="flex items-center gap-2">
              <ThumbsUp className={`h-5 w-5 ${
                opportunity.icr >= 2 && opportunity.lvr <= 65 &&
                isRiskNo(opportunity.existing_liabilities) &&
                isRiskNo(opportunity.ato_liabilities) &&
                isRiskNo(opportunity.credit_issues ?? opportunity.credit_file_issues)
                  ? 'text-green-600'
                  : opportunity.icr >= 2 && opportunity.lvr <= 80
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`} />
              <p className={`font-semibold ${
                opportunity.icr >= 2 && opportunity.lvr <= 65 &&
                isRiskNo(opportunity.existing_liabilities) &&
                isRiskNo(opportunity.ato_liabilities) &&
                isRiskNo(opportunity.credit_issues ?? opportunity.credit_file_issues)
                  ? 'text-green-700'
                  : opportunity.icr >= 2 && opportunity.lvr <= 80
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}>
                {opportunity.icr >= 2 && opportunity.lvr <= 65 &&
                 isRiskNo(opportunity.existing_liabilities) &&
                 isRiskNo(opportunity.ato_liabilities) &&
                 isRiskNo(opportunity.credit_issues ?? opportunity.credit_file_issues)
                  ? 'Deal looks good'
                  : opportunity.icr >= 2 && opportunity.lvr <= 80
                  ? 'Needs confirmation'
                  : 'Requires further assessment'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
