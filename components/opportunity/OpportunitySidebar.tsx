'use client';

import { Calendar, MapPin, Pencil, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface OpportunitySidebarProps {
  opportunity: any;
  formatDate: (date?: string) => string;
  formatCurrency?: (amount: number | undefined) => string;
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
  formatCurrency,
  canEditDates = false,
  isUnqualified = false,
  onEditExternalRef,
  onEditTargetSettlement,
  onEditDateSettled,
  onEditDealFinalisation,
  onClearTargetSettlement,
  onClearDateSettled
}: OpportunitySidebarProps) {
  const isCompletedDeclined = opportunity?.status === 'declined' && !!opportunity?.completed_declined_reason;
  const isDecisionDeclined = opportunity?.status === 'declined' && !opportunity?.completed_declined_reason;

  const getProgressPercentage = (status: string) => {
    if (status === 'settled' || status === 'withdrawn') return 100;
    if (status === 'declined' && isCompletedDeclined) return 100;

    const statusOrder: { [key: string]: number } = {
      'draft': 10,
      'opportunity': 20,
      'application_created': 40,
      'application_submitted': 60,
      'conditionally_approved': 80,
      'approved': 80,
      'declined': 80,
    };
    return statusOrder[status?.toLowerCase()] || 20;
  };

  const isStatusCompleted = (checkStatus: string) => {
    const completedStageStatuses = ['settled', 'withdrawn'];
    if (completedStageStatuses.includes(opportunity?.status?.toLowerCase()) || isCompletedDeclined) {
      return true;
    }

    const statusOrder = ['opportunity', 'application_created', 'application_submitted', 'conditionally_approved', 'approved', 'declined', 'settled'];
    const checkIndex = statusOrder.indexOf(checkStatus);
    const currentIndex = statusOrder.indexOf(opportunity?.status?.toLowerCase());
    return currentIndex >= checkIndex && checkIndex !== -1;
  };

  const isCompletedStage = opportunity?.status === 'settled' || opportunity?.status === 'withdrawn' || isCompletedDeclined;

  const defaultFormatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currencyFormatter = formatCurrency || defaultFormatCurrency;

  const progressPercent = getProgressPercentage(opportunity?.status || 'draft');

  return (
    <div className="space-y-5">
      {/* External Reference - Only show if admin can edit */}
      {canEditDates && (
        <Card className="mb-0">
          <CardContent className="pt-6">
            {opportunity.external_ref ? (
              <div>
                <p className="text-sm text-gray-500 mb-1">External Ref #</p>
                <p className="font-medium">{opportunity.external_ref}</p>
              </div>
            ) : (
              onEditExternalRef && (
                <button
                  onClick={onEditExternalRef}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  Add External Ref #
                </button>
              )
            )}
          </CardContent>
        </Card>
      )}

      {!isUnqualified && (
        <>
          {/* Key Dates Card */}
          <div className="rounded-xl overflow-hidden shadow-md">
            <div style={{ backgroundColor: '#02383B' }} className="p-6 text-white">
              <h3 className="text-[#00D37F] font-semibold text-base mb-5">Key Dates</h3>

              <div className="space-y-4">
                {/* Created */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Created</span>
                  </div>
                  <span className="font-semibold text-white text-sm">{formatDate(opportunity.created_at)}</span>
                </div>

                <div className="border-t border-white/10" />

                {/* Target Settlement */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Target Settlement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {opportunity.target_settlement_date ? (
                      <>
                        {canEditDates && onClearTargetSettlement && (
                          <button
                            onClick={onClearTargetSettlement}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Clear date"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className="font-semibold text-white text-sm">{formatDate(opportunity.target_settlement_date)}</span>
                      </>
                    ) : (
                      canEditDates && onEditTargetSettlement ? (
                        <button onClick={onEditTargetSettlement} className="text-[#00D37F] text-sm font-medium hover:underline transition-colors">
                          Set Date
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )
                    )}
                  </div>
                </div>

                {/* Settled */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Settled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {opportunity.date_settled ? (
                      <>
                        {canEditDates && onClearDateSettled && (
                          <button
                            onClick={onClearDateSettled}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Clear date"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className="font-semibold text-white text-sm">{formatDate(opportunity.date_settled)}</span>
                      </>
                    ) : (
                      canEditDates && onEditDateSettled ? (
                        <button onClick={onEditDateSettled} className="text-[#00D37F] text-sm font-medium hover:underline transition-colors">
                          Set Date
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deal Finalisation Card */}
          <div className="rounded-xl overflow-hidden shadow-md">
            <div style={{ backgroundColor: '#02383B' }} className="p-6 text-white">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[#00D37F] font-semibold text-base">Deal Finalisation</h3>
                {canEditDates && onEditDealFinalisation && (
                  <button
                    onClick={onEditDealFinalisation}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Edit deal finalisation"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Loan Acc Ref</span>
                  <span className="font-semibold text-white text-sm">{opportunity.loan_acc_ref_no || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Flex ID</span>
                  <span className="font-semibold text-white text-sm">{opportunity.flex_id || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Payment Received</span>
                  <span className="font-semibold text-white text-sm">
                    {opportunity.payment_received_date ? formatDate(opportunity.payment_received_date) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Payment Amount</span>
                  <span className="font-semibold text-white text-sm">
                    {opportunity.payment_amount ? currencyFormatter(opportunity.payment_amount) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Application Progress Card */}
          <div className="rounded-xl overflow-hidden shadow-md bg-white">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#02383B] text-lg">Application Progress</h3>
                <span className="text-[#00D37F] font-semibold text-sm">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#00D37F] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Opportunity */}
                <TimelineStep
                  label="Opportunity"
                  completed={isStatusCompleted('opportunity')}
                  showLine
                />

                {/* Application Created */}
                <TimelineStep
                  label="Application Created"
                  completed={isStatusCompleted('application_created')}
                  showLine
                />

                {/* Application Submitted */}
                <TimelineStep
                  label="Application Submitted"
                  completed={isStatusCompleted('application_submitted')}
                  showLine
                />

                {/* Application Decision */}
                <TimelineStep
                  label="Application Decision"
                  completed={isStatusCompleted('conditionally_approved') || isStatusCompleted('approved') || isDecisionDeclined}
                  showLine
                >
                  <div className="flex flex-wrap gap-2 mt-2 ml-9">
                    <PillBadge
                      label="Conditional"
                      active={opportunity?.status === 'conditionally_approved'}
                    />
                    <PillBadge
                      label="Approved"
                      active={opportunity?.status === 'approved'}
                    />
                    <PillBadge
                      label="Declined"
                      active={isDecisionDeclined}
                    />
                  </div>
                </TimelineStep>

                {/* Completed */}
                <TimelineStep
                  label="Completed"
                  completed={isCompletedStage}
                  showLine={false}
                >
                  <div className="flex flex-wrap gap-2 mt-2 ml-9">
                    <PillBadge
                      label="Settled"
                      active={opportunity?.status === 'settled'}
                    />
                    <PillBadge
                      label="Declined"
                      active={isCompletedDeclined}
                    />
                    <PillBadge
                      label="Withdrawn"
                      active={opportunity?.status === 'withdrawn'}
                    />
                  </div>
                </TimelineStep>
              </div>
            </div>
          </div>
        </>
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

function TimelineStep({
  label,
  completed,
  showLine,
  children,
}: {
  label: string;
  completed: boolean;
  showLine: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        {/* Circle + Line */}
        <div className="flex flex-col items-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              completed
                ? 'bg-[#00D37F]'
                : 'bg-gray-200'
            }`}
          >
            {completed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
          </div>
          {showLine && (
            <div
              className={`w-0.5 flex-1 min-h-[28px] ${
                completed ? 'bg-[#00D37F]' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
        {/* Label */}
        <span className={`text-[15px] font-medium pt-0.5 ${completed ? 'text-[#02383B]' : 'text-gray-400'}`}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function PillBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-block px-3.5 py-1 rounded-full text-xs font-medium border ${
        active
          ? 'bg-[#00D37F] text-white border-[#00D37F]'
          : 'bg-white text-gray-500 border-gray-300'
      }`}
    >
      {label}
    </span>
  );
}
