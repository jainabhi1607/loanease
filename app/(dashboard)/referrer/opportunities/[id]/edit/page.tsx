'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete, AddressData } from '@/components/address-autocomplete';

// Helper to allow only numbers (and optionally decimal point)
const handleNumericInput = (value: string): string => {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
};

interface ReferrerUser {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  role: string;
}

export default function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [isLoadingOpportunity, setIsLoadingOpportunity] = useState(true);
  const [opportunityId, setOpportunityId] = useState<string>('');
  const [referrerUsers, setReferrerUsers] = useState<ReferrerUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [pendingSelectedUser, setPendingSelectedUser] = useState<string>(''); // Store user ID until users are loaded
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [clientData, setClientData] = useState({
    entityName: '',
    entityType: '',
    companyAddress: '',
    abn: '',
    timeInBusiness: '',
    industry: '',
    briefOverview: ''
  });


  const [hasMoreInfo, setHasMoreInfo] = useState<'no' | 'yes'>('no');
  const [opportunityData, setOpportunityData] = useState({
    loanAmount: '',
    estimatedPropertyValue: '',
    loanType: '',
    loanPurpose: '',
    assetType: '',
    assetAddress: '',
  });

  const [financialDetails, setFinancialDetails] = useState({
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
    creditIssues: ''
  });

  const [additionalNotes, setAdditionalNotes] = useState('');
  const [icr, setIcr] = useState<number>(0);
  const [lvr, setLvr] = useState<number>(0);
  const [outcomeLevel, setOutcomeLevel] = useState<number>(0);
  const INTEREST_RATE = 12.5;

  const [termsAccepted, setTermsAccepted] = useState({
    term1: false,
    term2: false,
    term3: false,
    term4: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const response = await fetch(`/api/referrer/opportunities/${id}`);
        const data = await response.json();

        if (response.ok) {
          setOpportunityId(data.opportunity_id);
          // Store the user ID to be selected once the users list is loaded
          setPendingSelectedUser(data.created_by || '');

          setClientData({
            entityName: data.client_entity_name || '',
            entityType: data.entity_type || '',
            companyAddress: data.client_address || '',
            abn: data.client_abn || '',
            timeInBusiness: data.client_time_in_business || '',
            industry: data.client_industry || data.industry || '',
            briefOverview: data.client_brief_overview || data.brief_overview || ''
          });

          const hasLoanInfo = data.loan_amount > 0 || data.property_value > 0 || data.loan_type;
          setHasMoreInfo(hasLoanInfo ? 'yes' : 'no');

          setOpportunityData({
            loanAmount: data.loan_amount ? data.loan_amount.toString() : '',
            estimatedPropertyValue: data.property_value ? data.property_value.toString() : '',
            loanType: data.loan_type || '',
            loanPurpose: data.loan_purpose || '',
            assetType: data.asset_type || '',
            assetAddress: data.asset_address || '',
          });

          setFinancialDetails({
            fundedFromRental: data.rental_income === 'Yes' ? 'yes' : (data.rental_income === 'No' ? 'no' : ''),
            proposedRentalIncome: data.proposed_rental_income ? data.proposed_rental_income.toString() : '',
            netProfitBeforeTax: data.net_profit ? data.net_profit.toString() : '',
            amortisation: data.ammortisation ? data.ammortisation.toString() : '',
            depreciation: data.deprecition ? data.deprecition.toString() : '',
            existingInterestCosts: data.existing_interest_costs ? data.existing_interest_costs.toString() : '',
            rentalExpense: data.rental_expense ? data.rental_expense.toString() : '',
            existingLiabilities: data.existing_liabilities === 1 ? 'yes' : (data.existing_liabilities === 0 ? 'no' : ''),
            additionalSecurity: data.additional_property === 1 ? 'yes' : (data.additional_property === 0 ? 'no' : ''),
            smsf: data.smsf_structure === 1 ? 'yes' : (data.smsf_structure === 0 ? 'no' : ''),
            existingATO: data.ato_liabilities === 1 ? 'yes' : (data.ato_liabilities === 0 ? 'no' : ''),
            creditIssues: data.credit_file_issues === 1 ? 'yes' : (data.credit_file_issues === 0 ? 'no' : '')
          });

          setAdditionalNotes(data.additional_notes || '');
          setIcr(data.icr || 0);
          setLvr(data.lvr || 0);
          setOutcomeLevel(data.outcome_level || 0);

          setTermsAccepted({
            term1: data.term1 === 1,
            term2: data.term2 === 1,
            term3: data.term3 === 1,
            term4: data.term4 === 1
          });
        } else {
          toast({ title: "Error", description: "Failed to load opportunity data", variant: "destructive" });
          router.push('/referrer/opportunities');
        }
      } catch (error) {
        console.error('Error fetching opportunity:', error);
        toast({ title: "Error", description: "Failed to load opportunity data", variant: "destructive" });
        router.push('/referrer/opportunities');
      } finally {
        setIsLoadingOpportunity(false);
      }
    };

    fetchOpportunity();
  }, [id, router, toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/referrer/users');
        const data = await response.json();
        if (response.ok) {
          const users = data.users || [];
          setReferrerUsers(users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Set selected user once users are loaded and we have a pending selection
  useEffect(() => {
    // Only process when we have pending user, users are loaded, and not currently loading
    if (pendingSelectedUser && referrerUsers.length > 0 && !isLoadingUsers) {
      const userExists = referrerUsers.some((u: ReferrerUser) => u.id === pendingSelectedUser);
      if (userExists) {
        setSelectedUser(pendingSelectedUser);
        setPendingSelectedUser(''); // Clear the pending state
      }
    }
  }, [pendingSelectedUser, referrerUsers, isLoadingUsers]);

  useEffect(() => {
    const parseNumber = (value: string): number => {
      if (!value) return 0;
      return parseFloat(value.replace(/[$,]/g, '')) || 0;
    };

    const netProfit = parseNumber(financialDetails.netProfitBeforeTax);
    const amortisation = parseNumber(financialDetails.amortisation);
    const depreciation = parseNumber(financialDetails.depreciation);
    const existingInterestCosts = parseNumber(financialDetails.existingInterestCosts);
    const rentalExpense = parseNumber(financialDetails.rentalExpense);
    const proposedRentalIncome = parseNumber(financialDetails.proposedRentalIncome);
    const loanAmount = parseNumber(opportunityData.loanAmount);
    const estimatedValue = parseNumber(opportunityData.estimatedPropertyValue);

    let calculatedLvr = 0;
    if (loanAmount > 0 && estimatedValue > 0) {
      calculatedLvr = (loanAmount / estimatedValue) * 100;
    }
    setLvr(calculatedLvr);

    let calculatedIcr = 0;
    const totalIncomeServicing = netProfit + amortisation + depreciation + existingInterestCosts + rentalExpense + proposedRentalIncome;
    const proposedInterestCost = loanAmount * (INTEREST_RATE / 100);
    const totalInterest = existingInterestCosts + proposedInterestCost;

    if (totalInterest > 0) {
      calculatedIcr = totalIncomeServicing / totalInterest;
    }
    setIcr(calculatedIcr);

    let level = 0;
    if (calculatedIcr >= 2 && calculatedLvr <= 65) level = 1;
    else if (calculatedIcr >= 2 && calculatedLvr > 65 && calculatedLvr <= 80) level = 2;
    else if (calculatedLvr > 80) level = 3;
    else if (calculatedIcr < 2 && calculatedIcr >= 1.5) level = 2;
    else if (calculatedIcr < 1.5 && calculatedIcr > 0) level = 3;

    setOutcomeLevel(level);
  }, [financialDetails, opportunityData]);

  const handleBack = () => router.push('/referrer/opportunities');


  const handleSubmit = async (saveAsDraft: boolean = false) => {
    // Skip all validation for draft - just save whatever is filled
    if (!saveAsDraft) {
      if (!selectedUser) {
        toast({ title: "Validation Error", description: "Please select a team member", variant: "destructive" });
        return;
      }

      if (hasMoreInfo === 'yes') {
        if (!opportunityData.loanAmount || !opportunityData.estimatedPropertyValue || !opportunityData.loanType) {
          toast({ title: "Validation Error", description: "Please fill in loan amount, estimated property value, and loan type", variant: "destructive" });
          return;
        }
        if (!opportunityData.loanPurpose) {
          toast({ title: "Validation Error", description: "Please select a loan purpose", variant: "destructive" });
          return;
        }
      }

      if (!termsAccepted.term1 || !termsAccepted.term2 || !termsAccepted.term3 || !termsAccepted.term4) {
        toast({ title: "Validation Error", description: "Please accept all terms and conditions", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updateData: any = {
        status: saveAsDraft ? 'draft' : 'opportunity',
        created_by: selectedUser,
        entity_type: clientData.entityType || null,
        industry: clientData.industry || null,
        time_in_business: clientData.timeInBusiness || null,
        abn: clientData.abn || null,
        loan_amount: opportunityData.loanAmount ? parseFloat(opportunityData.loanAmount.replace(/[$,]/g, '')) : null,
        property_value: opportunityData.estimatedPropertyValue ? parseFloat(opportunityData.estimatedPropertyValue.replace(/[$,]/g, '')) : null,
        loan_type: opportunityData.loanType || null,
        loan_purpose: opportunityData.loanPurpose || null,
        asset_type: opportunityData.assetType || null,
        asset_address: opportunityData.assetAddress || null,
        icr: icr,
        lvr: lvr,
        client_address: clientData.companyAddress || null,
        brief_overview: clientData.briefOverview || null,
        additional_notes: additionalNotes || null,
        outcome_level: outcomeLevel,
        net_profit: financialDetails.netProfitBeforeTax ? parseFloat(financialDetails.netProfitBeforeTax.replace(/[$,]/g, '')) : null,
        ammortisation: financialDetails.amortisation ? parseFloat(financialDetails.amortisation.replace(/[$,]/g, '')) : null,
        deprecition: financialDetails.depreciation ? parseFloat(financialDetails.depreciation.replace(/[$,]/g, '')) : null,
        existing_interest_costs: financialDetails.existingInterestCosts ? parseFloat(financialDetails.existingInterestCosts.replace(/[$,]/g, '')) : null,
        rental_expense: financialDetails.rentalExpense ? parseFloat(financialDetails.rentalExpense.replace(/[$,]/g, '')) : null,
        proposed_rental_income: financialDetails.proposedRentalIncome ? parseFloat(financialDetails.proposedRentalIncome.replace(/[$,]/g, '')) : null,
        existing_liabilities: financialDetails.existingLiabilities || null,
        additional_property: financialDetails.additionalSecurity || null,
        smsf_structure: financialDetails.smsf || null,
        ato_liabilities: financialDetails.existingATO || null,
        credit_file_issues: financialDetails.creditIssues || null,
        rental_income: financialDetails.fundedFromRental === 'yes' ? 'Yes' : (financialDetails.fundedFromRental === 'no' ? 'No' : null),
        term1: termsAccepted.term1 ? 1 : 0,
        term2: termsAccepted.term2 ? 1 : 0,
        term3: termsAccepted.term3 ? 1 : 0,
        term4: termsAccepted.term4 ? 1 : 0,
      };

      const response = await fetch(`/api/referrer/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update opportunity');
      }

      toast({
        title: "Success!",
        description: saveAsDraft ? `Draft ${opportunityId} saved` : `Opportunity ${opportunityId} submitted`,
      });
      router.push('/referrer/opportunities');
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({ title: "Error", description: "Failed to update opportunity. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingOpportunity) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading opportunity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Opportunity - {opportunityId}</h1>
        <p className="text-muted-foreground mt-1">Continue editing your draft opportunity</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Team Member</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="referrer-user">Select Team Member <span className="text-red-500">*</span></Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={isLoadingUsers}>
                <SelectTrigger id="referrer-user">
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {referrerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.first_name} {user.surname} ({user.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Review and update client information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ABN / GST No. Field */}
            <div className="space-y-2">
              <Label>ABN / GST No.</Label>
              <Input
                placeholder="ABN / GST No."
                value={clientData.abn}
                onChange={(e) => setClientData(prev => ({ ...prev, abn: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={clientData.entityType} onValueChange={(v) => setClientData(prev => ({ ...prev, entityType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_company">Private Company</SelectItem>
                    <SelectItem value="sole_trader">Sole Trader</SelectItem>
                    <SelectItem value="smsf_trust">SMSF Trust</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entity Name</Label>
                <Input value={clientData.entityName} onChange={(e) => setClientData(prev => ({ ...prev, entityName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time in Business</Label>
              <Input value={clientData.timeInBusiness} onChange={(e) => setClientData(prev => ({ ...prev, timeInBusiness: e.target.value }))} placeholder="e.g., 4 Years" />
            </div>
            <div className="space-y-2">
              <Label>Company Address</Label>
              <AddressAutocomplete
                value={clientData.companyAddress}
                onChange={(value: string, addressData?: AddressData) => {
                  if (addressData) {
                    setClientData(prev => ({
                      ...prev,
                      companyAddress: addressData.fullAddress
                    }));
                  } else {
                    setClientData(prev => ({ ...prev, companyAddress: value }));
                  }
                }}
                placeholder="Start typing address or enter manually"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={clientData.industry} onValueChange={(v) => setClientData(prev => ({ ...prev, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arts_and_lifestyle">Arts and Lifestyle</SelectItem>
                    <SelectItem value="building_and_trade">Building and Trade</SelectItem>
                    <SelectItem value="financial_services_and_insurance">Financial Services and Insurance</SelectItem>
                    <SelectItem value="hair_and_beauty">Hair and Beauty</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="agriculture_farming_and_mining">Agriculture, Farming and Mining</SelectItem>
                    <SelectItem value="real_estate_and_property_management">Real Estate and Property Management</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="professional_services">Professional Services</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="transport_and_automotive">Transport and Automotive</SelectItem>
                    <SelectItem value="wholesaling">Wholesaling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Brief Overview <span className="text-red-500">*</span></Label>
              <Textarea rows={5} value={clientData.briefOverview} onChange={(e) => setClientData(prev => ({ ...prev, briefOverview: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detailed Opportunity Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasMoreInfo} onValueChange={(v) => setHasMoreInfo(v as 'no' | 'yes')} className="space-y-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="no" id="no-more" />
                <Label htmlFor="no-more">I do not have further information at this time</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="yes" id="has-more" />
                <Label htmlFor="has-more">I have more loan information</Label>
              </div>
            </RadioGroup>

            {hasMoreInfo === 'yes' && (
              <div className="mt-6 space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loan Amount <span className="text-red-500">*</span></Label>
                    <Input value={opportunityData.loanAmount} onChange={(e) => setOpportunityData(prev => ({ ...prev, loanAmount: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Property Value <span className="text-red-500">*</span></Label>
                    <Input value={opportunityData.estimatedPropertyValue} onChange={(e) => setOpportunityData(prev => ({ ...prev, estimatedPropertyValue: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type of Asset</Label>
                    <Select value={opportunityData.assetType} onValueChange={(v) => setOpportunityData(prev => ({ ...prev, assetType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial_property">Commercial Property</SelectItem>
                        <SelectItem value="residential_property">Residential Property</SelectItem>
                        <SelectItem value="vacant_land">Vacant Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Address</Label>
                    <AddressAutocomplete
                      value={opportunityData.assetAddress}
                      onChange={(value: string, addressData?: AddressData) => {
                        if (addressData) {
                          setOpportunityData(prev => ({
                            ...prev,
                            assetAddress: addressData.fullAddress
                          }));
                        } else {
                          setOpportunityData(prev => ({ ...prev, assetAddress: value }));
                        }
                      }}
                      placeholder="Start typing address or enter manually"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Loan Type <span className="text-red-500">*</span></Label>
                  <Select value={opportunityData.loanType} onValueChange={(v) => setOpportunityData(prev => ({ ...prev, loanType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="lease_doc">Lease Doc</SelectItem>
                      <SelectItem value="low_doc">Low Doc</SelectItem>
                      <SelectItem value="private_short_term">Private / Short Term</SelectItem>
                      <SelectItem value="unsure">Unsure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Loan Purpose</Label>
                  <RadioGroup value={opportunityData.loanPurpose} onValueChange={(v) => setOpportunityData(prev => ({ ...prev, loanPurpose: v }))}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="purchase_owner_occupier" id="p1" /><Label htmlFor="p1">Purchase - Owner Occupier</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="purchase_investment" id="p2" /><Label htmlFor="p2">Purchase - Investment</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="refinance" id="p3" /><Label htmlFor="p3">Refinance</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="equity_release" id="p4" /><Label htmlFor="p4">Equity Release</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="business_use" id="p5" /><Label htmlFor="p5">Business Use</Label></div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Details - Only show if has more info */}
        {hasMoreInfo === 'yes' && (
          <Card>
            <CardHeader><CardTitle>Financial Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Funding</Label>
                <p className="text-sm text-muted-foreground">Will the property be funded solely from rental income?</p>
                <RadioGroup value={financialDetails.fundedFromRental} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, fundedFromRental: v }))} className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="yes" id="funded-yes" />
                    <Label htmlFor="funded-yes" className="cursor-pointer font-normal flex-1">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="no" id="funded-no" />
                    <Label htmlFor="funded-no" className="cursor-pointer font-normal flex-1">No</Label>
                  </div>
                </RadioGroup>

                {financialDetails.fundedFromRental === 'yes' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Proposed Rental Income (Annual)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input className="pl-7" value={financialDetails.proposedRentalIncome} onChange={(e) => setFinancialDetails(prev => ({ ...prev, proposedRentalIncome: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                      </div>
                    </div>
                  </div>
                )}

                {financialDetails.fundedFromRental === 'no' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Net Profit Before Tax</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input className="pl-7" value={financialDetails.netProfitBeforeTax} onChange={(e) => setFinancialDetails(prev => ({ ...prev, netProfitBeforeTax: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                      </div>
                    </div>
                    <div><Label className="text-base font-semibold">Addbacks</Label></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amortisation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input className="pl-7" value={financialDetails.amortisation} onChange={(e) => setFinancialDetails(prev => ({ ...prev, amortisation: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Depreciation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input className="pl-7" value={financialDetails.depreciation} onChange={(e) => setFinancialDetails(prev => ({ ...prev, depreciation: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Existing Interest Costs</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input className="pl-7" value={financialDetails.existingInterestCosts} onChange={(e) => setFinancialDetails(prev => ({ ...prev, existingInterestCosts: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rental Expense</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input className="pl-7" value={financialDetails.rentalExpense} onChange={(e) => setFinancialDetails(prev => ({ ...prev, rentalExpense: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Proposed Rental Income (Annual)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input className="pl-7" value={financialDetails.proposedRentalIncome} onChange={(e) => setFinancialDetails(prev => ({ ...prev, proposedRentalIncome: handleNumericInput(e.target.value) }))} inputMode="numeric" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Other Questions</Label>
                <div className="space-y-4 mt-3">
                  <div>
                    <p className="text-sm mb-2">Does your business and /or the borrowing entity have any existing liabilities?</p>
                    <RadioGroup value={financialDetails.existingLiabilities} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, existingLiabilities: v }))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="liabilities-yes" /><Label htmlFor="liabilities-yes" className="cursor-pointer font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="liabilities-no" /><Label htmlFor="liabilities-no" className="cursor-pointer font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <p className="text-sm mb-2">Are you looking to offer up additional property security to support your equity position?</p>
                    <RadioGroup value={financialDetails.additionalSecurity} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, additionalSecurity: v }))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="security-yes" /><Label htmlFor="security-yes" className="cursor-pointer font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="security-no" /><Label htmlFor="security-no" className="cursor-pointer font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <p className="text-sm mb-2">Is the application an SMSF structure?</p>
                    <RadioGroup value={financialDetails.smsf} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, smsf: v }))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="smsf-yes" /><Label htmlFor="smsf-yes" className="cursor-pointer font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="smsf-no" /><Label htmlFor="smsf-no" className="cursor-pointer font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <p className="text-sm mb-2">Do you have any existing or overdue ATO / tax liabilities?</p>
                    <RadioGroup value={financialDetails.existingATO} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, existingATO: v }))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="ato-yes" /><Label htmlFor="ato-yes" className="cursor-pointer font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="ato-no" /><Label htmlFor="ato-no" className="cursor-pointer font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <p className="text-sm mb-2">Do you have any credit file issues e.g. paid or unpaid defaults?</p>
                    <RadioGroup value={financialDetails.creditIssues} onValueChange={(v) => setFinancialDetails(prev => ({ ...prev, creditIssues: v }))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="credit-yes" /><Label htmlFor="credit-yes" className="cursor-pointer font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="credit-no" /><Label htmlFor="credit-no" className="cursor-pointer font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Outcome Display */}
              <div className="space-y-4 pt-4 border-t">
                <h5 className="font-bold text-lg">Outcome</h5>
                {(icr > 0 || lvr > 0) && (
                  <div className="space-y-2">
                    {icr > 0 && <div className="text-sm font-medium">ICR: {icr.toFixed(3)}</div>}
                    {lvr > 0 && <div className="text-sm font-medium">LVR: {lvr.toFixed(0)}</div>}
                  </div>
                )}
                {outcomeLevel === 0 && <div className="bg-[#f0fdf4] border border-[#d1f4e0] rounded-lg p-4 text-sm text-muted-foreground">Please complete the fields above to reveal an initial outcome.</div>}
                {outcomeLevel === 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-green-600 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                    <div className="text-green-800 text-sm">Deal looks good. Submit now!</div>
                  </div>
                )}
                {outcomeLevel === 2 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-yellow-600 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
                    <div className="text-yellow-800 text-sm">Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.</div>
                  </div>
                )}
                {outcomeLevel === 3 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-red-600 mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></div>
                    <div className="text-red-800 text-sm">Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <p className="text-sm text-muted-foreground">Please add any additional notes for this opportunity.</p>
                <Textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox id="term1" checked={termsAccepted.term1} onCheckedChange={(c) => setTermsAccepted(prev => ({ ...prev, term1: c as boolean }))} />
              <Label htmlFor="term1" className="font-normal">I confirm that all information is true and correct.</Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="term2" checked={termsAccepted.term2} onCheckedChange={(c) => setTermsAccepted(prev => ({ ...prev, term2: c as boolean }))} />
              <Label htmlFor="term2" className="font-normal">I confirm the client has consented to submitting their information.</Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="term3" checked={termsAccepted.term3} onCheckedChange={(c) => setTermsAccepted(prev => ({ ...prev, term3: c as boolean }))} />
              <Label htmlFor="term3" className="font-normal">I have advised the client about the referral fee.</Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="term4" checked={termsAccepted.term4} onCheckedChange={(c) => setTermsAccepted(prev => ({ ...prev, term4: c as boolean }))} />
              <Label htmlFor="term4" className="font-normal">I have advised the client about the Service Fee.</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
            {isSubmitting ? 'Submitting...' : 'Save & Submit Opportunity'}
          </Button>
          <Button variant="outline" disabled={isSubmitting} onClick={() => handleSubmit(true)} className="border-green-600 text-green-600 hover:bg-green-50">
            Save and return later
          </Button>
          <Button variant="ghost" disabled={isSubmitting} onClick={handleBack}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
