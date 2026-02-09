'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, RotateCcw, Loader2 } from 'lucide-react';

interface FundingData {
  loanAmount: string;
  estimatedPropertyValue: string;
  fundedFromRental: string;
  proposedRentalIncome: string;
  netProfitBeforeTax: string;
  amortisation: string;
  depreciation: string;
  existingInterestCosts: string;
  rentalExpense: string;
}

interface OtherQuestionsData {
  existingLiabilities: string;
  additionalSecurity: string;
  smsf: string;
  existingATO: string;
}

interface OutcomeResult {
  icr: number;
  lvr: number;
  status: 'green' | 'yellow' | 'red' | null;
  message: string;
}

function PreAssessmentContent() {
  const router = useRouter();
  const [fundingData, setFundingData] = useState<FundingData>({
    loanAmount: '',
    estimatedPropertyValue: '',
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
  });

  const [otherQuestionsData, setOtherQuestionsData] = useState<OtherQuestionsData>({
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
  });

  const [outcome, setOutcome] = useState<OutcomeResult>({
    icr: 0,
    lvr: 0,
    status: null,
    message: 'Please complete the fields above to reveal an initial outcome.',
  });

  const [interestRate, setInterestRate] = useState(8.5);

  useEffect(() => {
    const fetchInterestRate = async () => {
      try {
        const response = await fetch('/api/settings/interest-rate');
        if (response.ok) {
          const data = await response.json();
          setInterestRate(data.interestRate || 8.5);
        }
      } catch (error) {
        console.error('Error fetching interest rate:', error);
      }
    };
    fetchInterestRate();
  }, []);

  useEffect(() => {
    calculateOutcome();
  }, [fundingData, otherQuestionsData, interestRate]);

  const calculateOutcome = () => {
    const loanAmount = parseFloat(fundingData.loanAmount.replace(/[$,]/g, '')) || 0;
    const propertyValue = parseFloat(fundingData.estimatedPropertyValue.replace(/[$,]/g, '')) || 0;

    if (loanAmount === 0 || propertyValue === 0) {
      setOutcome({
        icr: 0,
        lvr: 0,
        status: null,
        message: 'Please complete the fields above to reveal an initial outcome.',
      });
      return;
    }

    // Parse financial fields
    const netProfit = parseFloat(fundingData.netProfitBeforeTax.replace(/[$,]/g, '')) || 0;
    const amortisation = parseFloat(fundingData.amortisation.replace(/[$,]/g, '')) || 0;
    const depreciation = parseFloat(fundingData.depreciation.replace(/[$,]/g, '')) || 0;
    const existingInterestCosts = parseFloat(fundingData.existingInterestCosts.replace(/[$,]/g, '')) || 0;
    const rentalExpense = parseFloat(fundingData.rentalExpense.replace(/[$,]/g, '')) || 0;
    const proposedRentalIncome = parseFloat(fundingData.proposedRentalIncome.replace(/[$,]/g, '')) || 0;

    // Calculate LVR
    const lvr = (loanAmount / propertyValue) * 100;

    // Calculate ICR
    const totalIncomeServicing = netProfit + amortisation + depreciation + existingInterestCosts + rentalExpense + proposedRentalIncome;
    const totalInterest = existingInterestCosts + (loanAmount * interestRate / 100);
    const icr = totalInterest > 0 ? totalIncomeServicing / totalInterest : 0;

    // Count Yes answers
    const hasYesAnswers =
      otherQuestionsData.existingLiabilities === 'yes' ||
      otherQuestionsData.additionalSecurity === 'yes' ||
      otherQuestionsData.smsf === 'yes' ||
      otherQuestionsData.existingATO === 'yes';

    let status: 'green' | 'yellow' | 'red' = 'green';
    let message = '';
    let isGreen = false;

    // Determine outcome based on ICR and LVR
    if (icr >= 2 && lvr <= 65) {
      status = 'green';
      message = 'Deal looks good. Submit now!';
      isGreen = true;
    } else if (icr >= 2 && lvr > 65 && lvr <= 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr >= 2 && lvr > 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr <= 65) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr > 65 && lvr <= 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr > 80) {
      status = 'red';
      message = 'Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.';
    }

    // If any Yes answers and was green, change to yellow
    if (hasYesAnswers && isGreen) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    }

    // If any Yes answers (regardless of other conditions), show yellow
    if (hasYesAnswers && status === 'green') {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    }

    // ICR < 1.5 always shows red (final override)
    if (icr < 1.5 && icr > 0) {
      status = 'red';
      message = 'Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.';
    }

    setOutcome({ icr, lvr, status, message });
  };

  const handleClearResult = () => {
    setFundingData({
      loanAmount: '',
      estimatedPropertyValue: '',
      fundedFromRental: '',
      proposedRentalIncome: '',
      netProfitBeforeTax: '',
      amortisation: '',
      depreciation: '',
      existingInterestCosts: '',
      rentalExpense: '',
    });
    setOtherQuestionsData({
      existingLiabilities: '',
      additionalSecurity: '',
      smsf: '',
      existingATO: '',
    });
    setOutcome({
      icr: 0,
      lvr: 0,
      status: null,
      message: 'Please complete the fields above to reveal an initial outcome.',
    });
  };

  const handleProgressToOpportunity = () => {
    const preAssessmentData = {
      ...fundingData,
      ...otherQuestionsData,
      icr: outcome.icr,
      lvr: outcome.lvr,
    };
    sessionStorage.setItem('preAssessmentData', JSON.stringify(preAssessmentData));
    router.push('/referrer/opportunities/add');
  };

  // Format number as currency with $ and commas
  const formatCurrency = (value: string): string => {
    const num = value.replace(/[$,]/g, '');
    if (!num || isNaN(Number(num))) return value;
    const number = parseFloat(num);
    return '$' + number.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Handle input change - only allow numbers
  const handleCurrencyChange = (field: keyof FundingData, value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFundingData({ ...fundingData, [field]: numericValue });
  };

  // Handle blur - format as currency
  const handleCurrencyBlur = (field: keyof FundingData) => {
    const value = fundingData[field];
    if (value) {
      setFundingData({ ...fundingData, [field]: formatCurrency(value) });
    }
  };

  const getOutcomeStyles = () => {
    if (!outcome.status) {
      return {
        containerClass: 'bg-white border border-[#d1f4e0] text-[#787274]',
        icon: null
      };
    }
    switch (outcome.status) {
      case 'green':
        return {
          containerClass: 'bg-[#d1f4e0] border border-[#00D37F] text-[#00D37F]',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          )
        };
      case 'yellow':
        return {
          containerClass: 'bg-[#FFF8E1] border border-[#FFB300] text-[#FFB300]',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'red':
        return {
          containerClass: 'bg-red-50 border border-red-400 text-red-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          containerClass: 'bg-white border border-[#d1f4e0] text-[#787274]',
          icon: null
        };
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[75px] pb-10">
      <div className="w-[800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#02383B]">Pre-Assessment Tool</h1>
          <Button
            variant="outline"
            onClick={handleClearResult}
            className="bg-white border-gray-300 text-[#787274] hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear Result
          </Button>
        </div>

        {/* Main Content */}
        <div className="bg-[#EDFFD7] rounded-xl p-10 space-y-6">
          {/* Your Client's Funding Requirements */}
          <div>
            <h2 className="text-lg font-semibold text-[#02383B] mb-6">Your Client&apos;s Funding Requirements</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <Label className="text-sm font-semibold text-[#02383B]">
                  Loan Amount<span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Loan Amount"
                  value={fundingData.loanAmount}
                  onChange={(e) => handleCurrencyChange('loanAmount', e.target.value)}
                  onBlur={() => handleCurrencyBlur('loanAmount')}
                  className="mt-2 bg-white border-[#E7EBEF] placeholder:text-[#787274]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#02383B]">
                  Estimated Property Value <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Estimated Property Value"
                  value={fundingData.estimatedPropertyValue}
                  onChange={(e) => handleCurrencyChange('estimatedPropertyValue', e.target.value)}
                  onBlur={() => handleCurrencyBlur('estimatedPropertyValue')}
                  className="mt-2 bg-white border-[#E7EBEF] placeholder:text-[#787274]"
                />
              </div>
            </div>

            {/* Funding Question */}
            <div>
              <Label className="text-sm font-semibold text-[#02383B] mb-2 block">Funding</Label>
              <p className="text-sm text-[#787274] mb-3">Will the property be funded solely from rental income?</p>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#d1f4e0] bg-[#f0fdf4] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="fundedFromRental"
                    checked={fundingData.fundedFromRental === 'yes'}
                    onChange={() => setFundingData({ ...fundingData, fundedFromRental: 'yes' })}
                    className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                  />
                  <span className="text-sm font-semibold text-[#02383B]">Yes</span>
                </label>
                <label
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#d1f4e0] bg-[#f0fdf4] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="fundedFromRental"
                    checked={fundingData.fundedFromRental === 'no'}
                    onChange={() => setFundingData({ ...fundingData, fundedFromRental: 'no' })}
                    className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                  />
                  <span className="text-sm font-semibold text-[#02383B]">No</span>
                </label>
              </div>

              {/* Conditional fields based on rental income answer */}
              {fundingData.fundedFromRental === 'yes' && (
                <div className="mt-4">
                  <Label className="text-sm font-semibold text-[#02383B]">Proposed Rental Income (Annual)</Label>
                  <Input
                    type="text"
                    placeholder="Proposed Rental Income"
                    value={fundingData.proposedRentalIncome}
                    onChange={(e) => handleCurrencyChange('proposedRentalIncome', e.target.value)}
                    onBlur={() => handleCurrencyBlur('proposedRentalIncome')}
                    className="mt-2 bg-white border-[#E7EBEF]"
                  />
                </div>
              )}

              {fundingData.fundedFromRental === 'no' && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-[#02383B]">Net Profit Before Tax</Label>
                    <Input
                      type="text"
                      placeholder="Net Profit Before Tax"
                      value={fundingData.netProfitBeforeTax}
                      onChange={(e) => handleCurrencyChange('netProfitBeforeTax', e.target.value)}
                      onBlur={() => handleCurrencyBlur('netProfitBeforeTax')}
                      className="mt-2 bg-white border-[#E7EBEF]"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-[#02383B]">Addbacks</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-[#02383B]">Amortisation</Label>
                      <Input
                        type="text"
                        placeholder="Amortisation"
                        value={fundingData.amortisation}
                        onChange={(e) => handleCurrencyChange('amortisation', e.target.value)}
                        onBlur={() => handleCurrencyBlur('amortisation')}
                        className="mt-2 bg-white border-[#E7EBEF]"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-[#02383B]">Depreciation</Label>
                      <Input
                        type="text"
                        placeholder="Depreciation"
                        value={fundingData.depreciation}
                        onChange={(e) => handleCurrencyChange('depreciation', e.target.value)}
                        onBlur={() => handleCurrencyBlur('depreciation')}
                        className="mt-2 bg-white border-[#E7EBEF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-[#02383B]">Existing Interest Costs</Label>
                      <Input
                        type="text"
                        placeholder="Existing Interest Costs"
                        value={fundingData.existingInterestCosts}
                        onChange={(e) => handleCurrencyChange('existingInterestCosts', e.target.value)}
                        onBlur={() => handleCurrencyBlur('existingInterestCosts')}
                        className="mt-2 bg-white border-[#E7EBEF]"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-[#02383B]">Rental Expense</Label>
                      <Input
                        type="text"
                        placeholder="Rental Expense"
                        value={fundingData.rentalExpense}
                        onChange={(e) => handleCurrencyChange('rentalExpense', e.target.value)}
                        onBlur={() => handleCurrencyBlur('rentalExpense')}
                        className="mt-2 bg-white border-[#E7EBEF]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-[#02383B]">Proposed Rental Income (Annual)</Label>
                    <Input
                      type="text"
                      placeholder="Proposed Rental Income"
                      value={fundingData.proposedRentalIncome}
                      onChange={(e) => handleCurrencyChange('proposedRentalIncome', e.target.value)}
                      onBlur={() => handleCurrencyBlur('proposedRentalIncome')}
                      className="mt-2 bg-white border-[#E7EBEF]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other Questions */}
          <div>
            <h2 className="text-lg font-semibold text-[#02383B] mb-6">Other Questions</h2>

            <div className="space-y-4">
              {/* Question 1 */}
              <div>
                <p className="text-sm text-[#787274] mb-2">Does your business and/or the borrowing entity have any existing liabilities</p>
                <div className="flex gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="existingLiabilities"
                      checked={otherQuestionsData.existingLiabilities === 'yes'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, existingLiabilities: 'yes' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="existingLiabilities"
                      checked={otherQuestionsData.existingLiabilities === 'no'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, existingLiabilities: 'no' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">No</span>
                  </label>
                </div>
              </div>

              {/* Question 2 */}
              <div>
                <p className="text-sm text-[#787274] mb-2">Are you looking to offer up additional property security to support your equity position?</p>
                <div className="flex gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="additionalSecurity"
                      checked={otherQuestionsData.additionalSecurity === 'yes'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, additionalSecurity: 'yes' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="additionalSecurity"
                      checked={otherQuestionsData.additionalSecurity === 'no'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, additionalSecurity: 'no' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">No</span>
                  </label>
                </div>
              </div>

              {/* Question 3 */}
              <div>
                <p className="text-sm text-[#787274] mb-2">Is the application an SMSF structure?</p>
                <div className="flex gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smsf"
                      checked={otherQuestionsData.smsf === 'yes'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, smsf: 'yes' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smsf"
                      checked={otherQuestionsData.smsf === 'no'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, smsf: 'no' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">No</span>
                  </label>
                </div>
              </div>

              {/* Question 4 */}
              <div>
                <p className="text-sm text-[#787274] mb-2">Do you have any existing or overdue ATO / tax liabilities?</p>
                <div className="flex gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="existingATO"
                      checked={otherQuestionsData.existingATO === 'yes'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, existingATO: 'yes' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="existingATO"
                      checked={otherQuestionsData.existingATO === 'no'}
                      onChange={() => setOtherQuestionsData({ ...otherQuestionsData, existingATO: 'no' })}
                      className="w-4 h-4 text-[#00D37F] border-[#00D37F] focus:ring-[#00D37F]"
                    />
                    <span className="text-sm font-semibold text-[#02383B]">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Outcome Section */}
          <div>
            <h2 className="text-lg font-semibold text-[#02383B] mb-4">Outcome</h2>
            {outcome.status && (outcome.icr > 0 || outcome.lvr > 0) && (
              <div className="flex gap-6 text-sm text-[#787274] mb-2">
                <p>ICR : {outcome.icr.toFixed(2)}</p>
                <p>LVR : {outcome.lvr.toFixed(0)}</p>
              </div>
            )}
            <div className={`p-4 rounded-lg flex items-start gap-3 ${getOutcomeStyles().containerClass}`}>
              {getOutcomeStyles().icon && (
                <div className="flex-shrink-0 mt-0.5">
                  {getOutcomeStyles().icon}
                </div>
              )}
              <p className="text-sm">{outcome.message}</p>
            </div>
          </div>

          {/* Progress to Opportunity */}
          <div>
            <h2 className="text-lg font-semibold text-[#02383B] mb-2">Progress to opportunity</h2>
            <p className="text-sm text-[#787274] mb-4">
              Click the button below to copy the details above to a new opportunity application
            </p>
            <Button
              onClick={handleProgressToOpportunity}
              className="bg-[#00D37F] hover:bg-[#00b86d] text-white"
              disabled={!fundingData.loanAmount || !fundingData.estimatedPropertyValue}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Progress to opportunity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <PreAssessmentContent />
    </Suspense>
  );
}
