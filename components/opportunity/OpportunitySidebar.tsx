'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';

interface OpportunitySidebarProps {
  opportunity: any;
  formatDate: (date?: string) => string;
  canEditDates?: boolean;
  isUnqualified?: boolean;
  onEditExternalRef?: () => void;
  onEditTargetSettlement?: () => void;
  onEditDateSettled?: () => void;
  onEditDealFinalisation?: () => void;
  onClearTargetSettlement?: () => void;
  onClearDateSettled?: () => void;
}

export function OpportunitySidebar({
  opportunity,
  formatDate,
  canEditDates = false,
  isUnqualified = false,
  onEditExternalRef,
  onEditTargetSettlement,
  onEditDateSettled,
  onEditDealFinalisation,
  onClearTargetSettlement,
  onClearDateSettled
}: OpportunitySidebarProps) {
  const getProgressPercentage = (status: string) => {
    const statusOrder = [
      'draft',
      'opportunity',
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'settled'
    ];
    const currentIndex = statusOrder.indexOf(status);
    if (currentIndex < 0) {
      // Handle declined/withdrawn
      if (status === 'declined' || status === 'withdrawn') return 100;
      return 20;
    }
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const isStatusCompleted = (checkStatus: string) => {
    const statusOrder = [
      'draft',
      'opportunity',
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'declined',
      'settled',
      'withdrawn'
    ];
    const currentIndex = statusOrder.indexOf(opportunity.status);
    const checkIndex = statusOrder.indexOf(checkStatus);
    return currentIndex >= checkIndex;
  };

  // Check if any application status is reached
  const hasApplicationStatus = () => {
    const applicationStatuses = [
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'declined',
      'settled',
      'withdrawn'
    ];
    return applicationStatuses.includes(opportunity.status);
  };

  return (
    <div className="space-y-0">
      {/* External Reference - Only show if admin can edit */}
      {canEditDates && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            {opportunity.external_ref ? (
              <div>
                <p className="text-sm text-gray-500 mb-1">External Ref #</p>
                <p className="font-medium">{opportunity.external_ref}</p>
              </div>
            ) : (
              onEditExternalRef && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditExternalRef}
                  className="w-full"
                >
                  Add External Ref #
                </Button>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Sidebar Card */}
      {!isUnqualified && (
        <div className="overflow-hidden rounded-lg shadow-md">
          {/* Application Progress - Light green section */}
          <div style={{ backgroundColor: 'rgb(237, 255, 215)' }} className="p-6">
            <h3 className="text-lg font-semibold mb-1 text-[#02383B]">Application Progress</h3>
            <p className="text-sm text-[#00D37F] font-medium mb-3">
              {getProgressPercentage(opportunity.status).toFixed(0)}% Completed
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-white/50 rounded-full h-2">
                <div
                  className="bg-[#00D37F] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(opportunity.status)}%` }}
                />
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="space-y-3">
              {/* Opportunity */}
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isStatusCompleted('opportunity')
                    ? 'border-[#00D37F] bg-transparent'
                    : 'border-gray-300 bg-transparent'
                }`}>
                  {isStatusCompleted('opportunity') && (
                    <Check className="h-3 w-3 text-[#00D37F]" strokeWidth={3} />
                  )}
                </div>
                <p className={`text-sm font-medium ${isStatusCompleted('opportunity') ? 'text-[#02383B]' : 'text-gray-400'}`}>
                  Opportunity
                </p>
              </div>

              {/* Application Closed */}
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  hasApplicationStatus()
                    ? 'border-[#00D37F] bg-transparent'
                    : 'border-gray-300 bg-transparent'
                }`}>
                  {hasApplicationStatus() && (
                    <Check className="h-3 w-3 text-[#00D37F]" strokeWidth={3} />
                  )}
                </div>
                <p className={`text-sm font-medium ${hasApplicationStatus() ? 'text-[#02383B]' : 'text-gray-400'}`}>
                  Application Closed
                </p>
              </div>

              {/* Application Submitted */}
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isStatusCompleted('application_submitted')
                    ? 'border-[#00D37F] bg-transparent'
                    : 'border-gray-300 bg-transparent'
                }`}>
                  {isStatusCompleted('application_submitted') && (
                    <Check className="h-3 w-3 text-[#00D37F]" strokeWidth={3} />
                  )}
                </div>
                <p className={`text-sm font-medium ${isStatusCompleted('application_submitted') ? 'text-[#02383B]' : 'text-gray-400'}`}>
                  Application Submitted
                </p>
              </div>

              {/* Application Decision */}
              <div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || opportunity.status === 'declined'
                      ? 'border-[#00D37F] bg-transparent'
                      : 'border-gray-300 bg-transparent'
                  }`}>
                    {(isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || opportunity.status === 'declined') && (
                      <Check className="h-3 w-3 text-[#00D37F]" strokeWidth={3} />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || opportunity.status === 'declined' ? 'text-[#02383B]' : 'text-gray-400'}`}>
                    Application Decision
                  </p>
                </div>
                {/* Sub-items */}
                <div className="ml-8 mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isStatusCompleted('conditionally_approved')
                        ? 'border-[#00D37F] bg-transparent'
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {isStatusCompleted('conditionally_approved') && (
                        <Check className="h-2.5 w-2.5 text-[#00D37F]" strokeWidth={3} />
                      )}
                    </div>
                    <p className={`text-xs ${isStatusCompleted('conditionally_approved') ? 'text-[#02383B]' : 'text-gray-400'}`}>
                      Conditionally Approved
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isStatusCompleted('approved')
                        ? 'border-[#00D37F] bg-transparent'
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {isStatusCompleted('approved') && (
                        <Check className="h-2.5 w-2.5 text-[#00D37F]" strokeWidth={3} />
                      )}
                    </div>
                    <p className={`text-xs ${isStatusCompleted('approved') ? 'text-[#02383B]' : 'text-gray-400'}`}>
                      Approved
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      opportunity.status === 'declined'
                        ? 'border-[#00D37F] bg-transparent'
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {opportunity.status === 'declined' && (
                        <Check className="h-2.5 w-2.5 text-[#00D37F]" strokeWidth={3} />
                      )}
                    </div>
                    <p className={`text-xs ${opportunity.status === 'declined' ? 'text-[#02383B]' : 'text-gray-400'}`}>
                      Declined
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Completed */}
              <div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isStatusCompleted('settled') || opportunity.status === 'declined' || opportunity.status === 'withdrawn'
                      ? 'border-[#00D37F] bg-transparent'
                      : 'border-gray-300 bg-transparent'
                  }`}>
                    {(isStatusCompleted('settled') || opportunity.status === 'declined' || opportunity.status === 'withdrawn') && (
                      <Check className="h-3 w-3 text-[#00D37F]" strokeWidth={3} />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isStatusCompleted('settled') || opportunity.status === 'declined' || opportunity.status === 'withdrawn' ? 'text-[#02383B]' : 'text-gray-400'}`}>
                    Application Completed
                  </p>
                </div>
                {/* Sub-items */}
                <div className="ml-8 mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isStatusCompleted('settled')
                        ? 'border-[#00D37F] bg-transparent'
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {isStatusCompleted('settled') && (
                        <Check className="h-2.5 w-2.5 text-[#00D37F]" strokeWidth={3} />
                      )}
                    </div>
                    <p className={`text-xs ${isStatusCompleted('settled') ? 'text-[#02383B]' : 'text-gray-400'}`}>
                      Settled
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      opportunity.status === 'withdrawn'
                        ? 'border-[#00D37F] bg-transparent'
                        : 'border-gray-300 bg-transparent'
                    }`}>
                      {opportunity.status === 'withdrawn' && (
                        <Check className="h-2.5 w-2.5 text-[#00D37F]" strokeWidth={3} />
                      )}
                    </div>
                    <p className={`text-xs ${opportunity.status === 'withdrawn' ? 'text-[#02383B]' : 'text-gray-400'}`}>
                      Withdrawn
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Dates - Dark teal section */}
          <div style={{ backgroundColor: '#02383B' }} className="p-6 text-white">
            {/* Date Created */}
            <div className="mb-4">
              <p className="text-sm text-[#00D37F] mb-1">Date Created</p>
              <p className="font-semibold">{formatDate(opportunity.created_at)}</p>
            </div>

            {/* Target Settlement */}
            <div className="mb-4">
              <p className="text-sm text-[#00D37F] mb-1">Target Settlement</p>
              {opportunity.target_settlement_date ? (
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{formatDate(opportunity.target_settlement_date)}</p>
                  {canEditDates && onClearTargetSettlement && (
                    <button
                      onClick={onClearTargetSettlement}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Clear date"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-300">A target settlement date has not yet been set.</p>
              )}
            </div>

            {/* Date Settled */}
            <div className="mb-4">
              <p className="text-sm text-[#00D37F] mb-1">Date Settled</p>
              {opportunity.date_settled ? (
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{formatDate(opportunity.date_settled)}</p>
                  {canEditDates && onClearDateSettled && (
                    <button
                      onClick={onClearDateSettled}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Clear date"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-300">A date settled date has not yet been set</p>
              )}
            </div>

            {/* Deal Finalisation Information */}
            <div className="mb-4 pt-4 border-t border-white/20">
              <p className="text-sm text-gray-400 mb-1">Deal Finalisation Information</p>
              {opportunity.deal_finalisation_status ? (
                <p className="text-white">{opportunity.deal_finalisation_status}</p>
              ) : (
                <p className="text-gray-300">No deal finalisation info yet</p>
              )}
            </div>

            {/* Edit Button */}
            {canEditDates && (
              <button
                onClick={onEditDealFinalisation || onEditTargetSettlement}
                className="flex items-center gap-2 text-white hover:text-[#00D37F] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Simplified card for unqualified opportunities */}
      {isUnqualified && (
        <Card className="border border-[#E7EBEF] shadow-none">
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm text-[#00D37F] mb-1">Date Created</p>
              <p className="font-semibold text-[#02383B]">{formatDate(opportunity.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <p className="font-semibold text-orange-600">Unqualified</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
