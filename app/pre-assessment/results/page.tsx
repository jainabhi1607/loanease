'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function ResultsContent() {
  const searchParams = useSearchParams();
  const [icr, setIcr] = useState<number>(0);
  const [lvr, setLvr] = useState<number>(0);
  const [outcome, setOutcome] = useState<'good' | 'caution' | 'risk'>('risk');

  useEffect(() => {
    const icrParam = searchParams.get('icr');
    const lvrParam = searchParams.get('lvr');
    const outcomeParam = searchParams.get('outcome');

    if (icrParam) setIcr(parseFloat(icrParam));
    if (lvrParam) setLvr(parseFloat(lvrParam));
    if (outcomeParam && (outcomeParam === 'good' || outcomeParam === 'caution' || outcomeParam === 'risk')) {
      setOutcome(outcomeParam);
    }
  }, [searchParams]);

  const getOutcomeConfig = () => {
    const configs = {
      good: {
        icon: <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        title: 'Deal looks promising',
        message: 'will meet the streamlined process.',
        action: 'Submit now and a Loancase team member will be in touch to discuss.',
        buttonColor: 'bg-green-600 hover:bg-green-700',
      },
      caution: {
        icon: <AlertTriangle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        title: 'Deal may meet the streamlined process',
        message: 'will require confirmation.',
        action: 'Submit now and a Loancase team member will be in touch to discuss.',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
      },
      risk: {
        icon: <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Deal does not meet the streamlined process',
        message: 'will require further assessment.',
        action: 'Submit now and a Loancase team member will be in touch to discuss.',
        buttonColor: 'bg-red-600 hover:bg-red-700',
      },
    };
    return configs[outcome];
  };

  const config = getOutcomeConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Pre-Assessment Tool
          </h1>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-xl bg-white">
          <div className="p-8">
            {/* Don't Let This Opportunity Stall Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Don&apos;t Let This Opportunity Stall
              </h2>
              <p className="text-gray-700 mb-3">
                You&apos;ve got early clarity—now keep the momentum going. Register as a Clue Referral Partner to progress your client&apos;s opportunity with full visibility, expert support, and access to our lender network.
              </p>
              <p className="text-gray-700 mb-4">
                Secure the deal. Strengthen the relationship. Start earning—today.
              </p>
              <Link href="/register">
                <span className="text-teal-700 font-semibold underline hover:text-teal-800">
                  Become a Loancase Referral Partner
                </span>
              </Link>
            </div>

            {/* Outcome Section */}
            <div className="border-t pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Outcome</h3>

              {/* ICR and LVR Display */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="text-gray-700 font-medium">ICR</span>
                  <span className="text-gray-900 font-semibold text-lg">{icr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="text-gray-700 font-medium">LVR</span>
                  <span className="text-gray-900 font-semibold text-lg">{lvr.toFixed(2)}</span>
                </div>
              </div>

              {/* Outcome Message Box */}
              <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-8 text-center`}>
                {config.icon}
                <p className={`${config.textColor} text-lg mb-2`}>
                  {config.title}
                </p>
                <p className={`${config.textColor} mb-1`}>
                  {config.message}
                </p>
                <p className={`${config.textColor} mb-6`}>
                  {config.action}
                </p>

                <Link href="/register">
                  <Button
                    className={`${config.buttonColor} text-white px-8 py-6 text-lg font-semibold`}
                  >
                    Click here to sign up →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            This is an indicative assessment only. Final loan approval is subject to full application review and assessment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PreAssessmentResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
