'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClientFundingRequirements } from '@/components/ClientFundingRequirements';
import { OtherQuestions } from '@/components/OtherQuestions';

export default function PreAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Contact details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Funding Requirements Data (using reusable component) - simplified for pre-assessment
  const [fundingData, setFundingData] = useState({
    loanAmount: '',
    estimatedPropertyValue: '',
    assetType: '',
    assetAddress: '',
    loanType: '',
    loanPurpose: '',
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
  });

  // Other Questions Data
  const [otherQuestionsData, setOtherQuestionsData] = useState({
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
    creditIssues: '',  });

  // Interest rate from settings
  const [interestRateSetting, setInterestRateSetting] = useState(8.5);

  // Fetch interest rate from settings on mount
  useEffect(() => {
    const fetchInterestRate = async () => {
      try {
        const response = await fetch('/api/settings/interest-rate');
        if (response.ok) {
          const data = await response.json();
          setInterestRateSetting(data.interestRate || 8.5);
        }
      } catch (error) {
        console.error('Error fetching interest rate:', error);
      }
    };
    fetchInterestRate();
  }, []);

  const handleFundingChange = (field: keyof typeof fundingData, value: string) => {
    setFundingData(prev => ({ ...prev, [field]: value }));
  };

  const handleOtherQuestionsChange = (field: keyof typeof otherQuestionsData, value: string) => {
    setOtherQuestionsData(prev => ({ ...prev, [field]: value }));
  };

  // Check if email exists (debounced)
  useEffect(() => {
    const checkEmailExists = async () => {
      if (!email || email.length < 3 || !email.includes('@')) {
        setEmailExists(false);
        return;
      }

      setCheckingEmail(true);
      try {
        const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email.toLowerCase())}`);
        const data = await response.json();
        setEmailExists(data.exists || false);
      } catch (error) {
        console.error('Error checking email:', error);
        setEmailExists(false);
      } finally {
        setCheckingEmail(false);
      }
    };

    // Debounce email check
    const timeoutId = setTimeout(() => {
      checkEmailExists();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate ICR and LVR
      const loan = parseFloat(fundingData.loanAmount) || 0;
      const property = parseFloat(fundingData.estimatedPropertyValue) || 0;
      const profit = parseFloat(fundingData.netProfitBeforeTax) || 0;
      const amort = parseFloat(fundingData.amortisation) || 0;
      const deprec = parseFloat(fundingData.depreciation) || 0;
      const existInt = parseFloat(fundingData.existingInterestCosts) || 0;
      const rental = parseFloat(fundingData.rentalExpense) || 0;
      const propRental = parseFloat(fundingData.proposedRentalIncome) || 0;

      // Calculate LVR
      let calculatedLvr = 0;
      if (loan > 0 && property > 0) {
        calculatedLvr = (loan / property) * 100;
      }

      // Calculate ICR
      let calculatedIcr = 0;
      if (loan > 0) {
        const totalIncome = profit + amort + deprec + existInt + rental + propRental;
        // Using interestRateSetting from component state
        const totalInterest = existInt + (loan * interestRateSetting / 100);

        if (totalInterest > 0) {
          calculatedIcr = totalIncome / totalInterest;
        }
      }

      // Determine outcome
      let determinedOutcome: 'good' | 'caution' | 'risk' = 'risk';
      if (calculatedIcr >= 2 && calculatedLvr <= 65) {
        determinedOutcome = 'good';
      } else if (calculatedIcr < 1.5 || calculatedLvr > 80) {
        determinedOutcome = 'risk';
      } else {
        determinedOutcome = 'caution';
      }

      // Risk questions can only worsen outcome
      const hasYesAnswers = Object.values(otherQuestionsData).some(v => v === 'yes');
      if (hasYesAnswers && determinedOutcome === 'good') {
        determinedOutcome = 'caution';
      }

      // ICR < 1.5 always red (final override)
      if (calculatedIcr < 1.5 && calculatedIcr > 0) {
        determinedOutcome = 'risk';
      }

      // Save contact details
      const response = await fetch('/api/pre-assessment/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          loanAmount: loan,
          propertyValue: property,
          lvr: calculatedLvr,
          icr: calculatedIcr,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save contact details');
      }

      // Redirect to results page
      router.push(`/pre-assessment/results?icr=${calculatedIcr.toFixed(2)}&lvr=${calculatedLvr.toFixed(2)}&outcome=${determinedOutcome}`);

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: 'Error',
        description: 'There was an error processing your assessment.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <Calculator className="h-16 w-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Loan Pre-Assessment Tool
          </h1>
          <p className="text-lg text-gray-600">
            Get an instant assessment of your loan application potential
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-green-600 text-white">
            <CardTitle className="text-2xl">Calculate Your Loan Metrics</CardTitle>
            <CardDescription className="text-teal-50">
              Enter your details below to see your LVR, ICR, and loan assessment
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Details Section */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                    />
                  </div>
                </div>

                {/* Email exists warning */}
                {emailExists && (
                  <div className="text-red-600 text-sm mt-2">
                    We see you already have an account. Please{' '}
                    <Link href="/login" className="underline font-medium hover:text-red-700">
                      log in
                    </Link>{' '}
                    to use the Pre-Assessment Tool.
                  </div>
                )}
              </div>

              {/* Your Client's Funding Requirements */}
              <div className="bg-white rounded-lg border p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Your Client&apos;s Funding Requirements</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="loanAmount">Loan Amount *</Label>
                    <Input
                      id="loanAmount"
                      type="text"
                      value={fundingData.loanAmount}
                      onChange={(e) => handleFundingChange('loanAmount', e.target.value)}
                      placeholder="Loan Amount"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimatedPropertyValue">Estimated property value *</Label>
                    <Input
                      id="estimatedPropertyValue"
                      type="text"
                      value={fundingData.estimatedPropertyValue}
                      onChange={(e) => handleFundingChange('estimatedPropertyValue', e.target.value)}
                      placeholder="Estimated property value"
                      required
                    />
                  </div>
                </div>

                {/* Funding Question */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">Will the property be funded solely from rental income?</p>
                  <RadioGroup
                    value={fundingData.fundedFromRental}
                    onValueChange={(value) => handleFundingChange('fundedFromRental', value)}
                    className="flex gap-8"
                  >
                    <label
                      htmlFor="funded-yes"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <RadioGroupItem value="yes" id="funded-yes" />
                      <span className="font-normal text-sm">Yes</span>
                    </label>
                    <label
                      htmlFor="funded-no"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <RadioGroupItem value="no" id="funded-no" />
                      <span className="font-normal text-sm">No</span>
                    </label>
                  </RadioGroup>

                  {/* Conditional fields based on rental income answer */}
                  {fundingData.fundedFromRental === 'yes' && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="proposedRentalIncome">Proposed Rental Income (Annual)</Label>
                        <Input
                          id="proposedRentalIncome"
                          type="text"
                          value={fundingData.proposedRentalIncome}
                          onChange={(e) => handleFundingChange('proposedRentalIncome', e.target.value)}
                          placeholder="Proposed Rental Income"
                        />
                      </div>
                    </div>
                  )}

                  {fundingData.fundedFromRental === 'no' && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="netProfitBeforeTax">Net Profit Before Tax</Label>
                        <Input
                          id="netProfitBeforeTax"
                          type="text"
                          value={fundingData.netProfitBeforeTax}
                          onChange={(e) => handleFundingChange('netProfitBeforeTax', e.target.value)}
                          placeholder="Net Profit Before Tax"
                        />
                      </div>

                      <div>
                        <Label className="text-base font-semibold">Addbacks</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amortisation">Amortisation</Label>
                          <Input
                            id="amortisation"
                            type="text"
                            value={fundingData.amortisation}
                            onChange={(e) => handleFundingChange('amortisation', e.target.value)}
                            placeholder="Amortisation"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="depreciation">Depreciation</Label>
                          <Input
                            id="depreciation"
                            type="text"
                            value={fundingData.depreciation}
                            onChange={(e) => handleFundingChange('depreciation', e.target.value)}
                            placeholder="Depreciation"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="existingInterestCosts">Existing Interest Costs</Label>
                          <Input
                            id="existingInterestCosts"
                            type="text"
                            value={fundingData.existingInterestCosts}
                            onChange={(e) => handleFundingChange('existingInterestCosts', e.target.value)}
                            placeholder="Existing Interest Costs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rentalExpense">Rental Expense</Label>
                          <Input
                            id="rentalExpense"
                            type="text"
                            value={fundingData.rentalExpense}
                            onChange={(e) => handleFundingChange('rentalExpense', e.target.value)}
                            placeholder="Rental Expense"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="proposedRentalIncome">Proposed Rental Income (Annual)</Label>
                        <Input
                          id="proposedRentalIncome"
                          type="text"
                          value={fundingData.proposedRentalIncome}
                          onChange={(e) => handleFundingChange('proposedRentalIncome', e.target.value)}
                          placeholder="Proposed Rental Income"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Questions Component */}
              <div className="bg-white rounded-lg">
                <OtherQuestions
                  data={otherQuestionsData}
                  onChange={handleOtherQuestionsChange}
                  isExpanded={true}
                />
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  disabled={loading || emailExists}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Calculating...' : 'Calculate Assessment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            This is an indicative assessment only. Final loan approval is subject to full application review and assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
