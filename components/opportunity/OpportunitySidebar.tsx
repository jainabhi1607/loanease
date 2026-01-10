'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Circle, X } from 'lucide-react';

interface OpportunitySidebarProps {
  opportunity: any;
  formatDate: (date?: string) => string;
  canEditDates?: boolean;
  isUnqualified?: boolean;
  onEditExternalRef?: () => void;
  onEditTargetSettlement?: () => void;
  onEditDateSettled?: () => void;
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
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 20;
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

  return (
    <div className="space-y-6">
      {/* External Reference - Only show if admin can edit */}
      {canEditDates && (
        <Card>
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

      {/* Key Dates - Hide for unqualified */}
      {!isUnqualified && (
        <Card className="border border-[#E7EBEF] shadow-none">
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm text-[#00D37F] mb-1">Date Created</p>
              <p className="font-semibold text-[#02383B]">{formatDate(opportunity.created_at)}</p>
            </div>

            {/* Target Settlement - Always show */}
            <div>
              <p className="text-sm text-[#00D37F] mb-1">Target Settlement</p>
              {opportunity.target_settlement_date ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#02383B]">{formatDate(opportunity.target_settlement_date)}</p>
                    {canEditDates && onClearTargetSettlement && (
                      <button
                        onClick={onClearTargetSettlement}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {canEditDates && onEditTargetSettlement && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onEditTargetSettlement}
                      className="p-0 h-auto text-[#00D37F]"
                    >
                      Edit
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[#787274]">A target settlement date has not yet been set.</p>
                  {canEditDates && onEditTargetSettlement && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onEditTargetSettlement}
                      className="p-0 h-auto text-[#00D37F]"
                    >
                      Set Date
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Date Settled - Always show */}
            <div>
              <p className="text-sm text-[#00D37F] mb-1">Date Settled</p>
              {opportunity.date_settled ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#02383B]">{formatDate(opportunity.date_settled)}</p>
                    {canEditDates && onClearDateSettled && (
                      <button
                        onClick={onClearDateSettled}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {canEditDates && onEditDateSettled && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onEditDateSettled}
                      className="p-0 h-auto text-[#00D37F]"
                    >
                      Edit
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[#787274]">A date settled date has not yet been set.</p>
                  {canEditDates && onEditDateSettled && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onEditDateSettled}
                      className="p-0 h-auto text-[#00D37F]"
                    >
                      Set Date
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Progress - Hide for unqualified */}
      {!isUnqualified && (
      <Card className="bg-gradient-to-br from-[#EDFFD7] to-[#f0fff4] border-0 shadow-none">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3 text-[#02383B]">Application Progress</h3>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#00D37F] h-2 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage(opportunity.status)}%` }}
              />
            </div>
            <p className="text-sm text-[#00D37F] mt-2">{getProgressPercentage(opportunity.status).toFixed(0)}% completed</p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            {/* Opportunity */}
            <div className="flex items-start gap-3">
              {isStatusCompleted('opportunity') ? (
                <div className="mt-1 rounded-full bg-[#00D37F] p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isStatusCompleted('opportunity') ? 'text-[#02383B]' : 'text-gray-500'}`}>
                  Opportunity
                </p>
              </div>
            </div>

            {/* Application Created */}
            <div className="flex items-start gap-3">
              {isStatusCompleted('application_created') ? (
                <div className="mt-1 rounded-full bg-[#00D37F] p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isStatusCompleted('application_created') ? 'text-[#02383B]' : 'text-gray-500'}`}>
                  Application Created
                </p>
              </div>
            </div>

            {/* Application Submitted */}
            <div className="flex items-start gap-3">
              {isStatusCompleted('application_submitted') ? (
                <div className="mt-1 rounded-full bg-[#00D37F] p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isStatusCompleted('application_submitted') ? 'text-[#02383B]' : 'text-gray-500'}`}>
                  Application Submitted
                </p>
              </div>
            </div>

            {/* Application Decision */}
            <div className="flex items-start gap-3">
              {isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || isStatusCompleted('declined') ? (
                <div className="mt-1 rounded-full bg-[#00D37F] p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || isStatusCompleted('declined') ? 'text-[#02383B]' : 'text-gray-500'}`}>
                  Application Decision
                </p>
                <div className="ml-4 mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${isStatusCompleted('conditionally_approved') ? 'fill-[#00D37F] text-[#00D37F]' : 'text-gray-300'}`} />
                    <span className={isStatusCompleted('conditionally_approved') ? 'text-[#02383B]' : 'text-gray-400'}>
                      Conditionally Approved
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${isStatusCompleted('approved') ? 'fill-[#00D37F] text-[#00D37F]' : 'text-gray-300'}`} />
                    <span className={isStatusCompleted('approved') ? 'text-[#02383B]' : 'text-gray-400'}>
                      Approved
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${opportunity.status === 'declined' ? 'fill-red-600 text-red-600' : 'text-gray-300'}`} />
                    <span className={opportunity.status === 'declined' ? 'text-red-800' : 'text-gray-400'}>
                      Declined
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Completed */}
            <div className="flex items-start gap-3">
              {isStatusCompleted('settled') || opportunity.status === 'declined' || opportunity.status === 'withdrawn' ? (
                <div className="mt-1 rounded-full bg-[#00D37F] p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-gray-400 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isStatusCompleted('settled') || opportunity.status === 'declined' || opportunity.status === 'withdrawn' ? 'text-[#02383B]' : 'text-gray-500'}`}>
                  Application Completed
                </p>
                <div className="ml-4 mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${isStatusCompleted('settled') ? 'fill-[#00D37F] text-[#00D37F]' : 'text-gray-300'}`} />
                    <span className={isStatusCompleted('settled') ? 'text-[#02383B]' : 'text-gray-400'}>
                      Settled
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${opportunity.status === 'declined' ? 'fill-red-600 text-red-600' : 'text-gray-300'}`} />
                    <span className={opportunity.status === 'declined' ? 'text-red-800' : 'text-gray-400'}>
                      Declined
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${opportunity.status === 'withdrawn' ? 'fill-gray-600 text-gray-600' : 'text-gray-300'}`} />
                    <span className={opportunity.status === 'withdrawn' ? 'text-gray-800' : 'text-gray-400'}>
                      Withdrawn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
