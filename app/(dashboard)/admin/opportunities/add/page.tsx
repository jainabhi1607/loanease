'use client';

import { useState, useEffect } from 'react';
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

interface Referrer {
  id: string;
  organisation_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  state: string;
  status: string;
  created_at: string;
}

interface ReferrerUser {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  role: string;
  created_at: string;
}

interface Client {
  id: string;
  organisation_id: string;
  abn: string;
  entity_name: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
}

export default function AddOpportunityPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Referrer & User Selection
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<string>('');
  const [referrerUsers, setReferrerUsers] = useState<ReferrerUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoadingReferrers, setIsLoadingReferrers] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Client Selection
  const [clientType, setClientType] = useState<'new' | 'existing'>('new');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // New Client Form Data
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    entityType: '',
    companyAddress: '',
    companyStreetAddress: '',
    companySuburb: '',
    companyState: '',
    companyPostcode: '',
    companyCountry: 'IN',
    abn: '',
    entityName: '',
    timeInBusiness: '',
    industry: '',
    briefOverview: ''
  });


  // Opportunity Information
  const [hasMoreInfo, setHasMoreInfo] = useState<'no' | 'yes'>('no');
  const [opportunityData, setOpportunityData] = useState({
    loanAmount: '',
    estimatedPropertyValue: '',
    loanType: '',
    loanPurpose: '', // Changed from array to single string
    assetType: '',
    assetAddress: '',
    assetStreetAddress: '',
    assetSuburb: '',
    assetState: '',
    assetPostcode: '',
    assetCountry: 'IN',
  });

  // Financial Details
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

  // Outcome & Notes
  const [outcome, setOutcome] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Calculations
  const [icr, setIcr] = useState<number>(0);
  const [lvr, setLvr] = useState<number>(0);
  const [outcomeLevel, setOutcomeLevel] = useState<number>(0); // 0=default, 1=green, 2=yellow, 3=red

  // Interest rate (fetched from settings)
  const [INTEREST_RATE, setInterestRate] = useState(8.5);

  // Terms & Conditions
  const [termsAccepted, setTermsAccepted] = useState({
    term1: false,
    term2: false,
    term3: false,
    term4: false
  });

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all referrers on component mount
  useEffect(() => {
    const fetchReferrers = async () => {
      try {
        setIsLoadingReferrers(true);
        const response = await fetch('/api/admin/referrers');
        const data = await response.json();

        if (response.ok) {
          setReferrers(data.referrers || []);
        } else {
          console.error('Failed to fetch referrers:', data.error);
        }
      } catch (error) {
        console.error('Error fetching referrers:', error);
      } finally {
        setIsLoadingReferrers(false);
      }
    };

    fetchReferrers();
  }, []);

  // Fetch interest rate from settings
  useEffect(() => {
    fetch('/api/settings/interest-rate')
      .then(res => res.json())
      .then(data => { if (data.interestRate) setInterestRate(data.interestRate); })
      .catch(() => {});
  }, []);

  // Fetch users when referrer is selected
  useEffect(() => {
    const fetchReferrerUsers = async () => {
      if (!selectedReferrer) {
        setReferrerUsers([]);
        setSelectedUser('');
        setClients([]);
        setSelectedClient('');
        return;
      }

      try {
        setIsLoadingUsers(true);
        const referrer = referrers.find(r => r.id === selectedReferrer);
        if (!referrer) return;

        const response = await fetch(`/api/admin/referrers/${referrer.organisation_id}/users`);
        const data = await response.json();

        if (response.ok) {
          setReferrerUsers(data.users || []);
        } else {
          console.error('Failed to fetch referrer users:', data.error);
        }
      } catch (error) {
        console.error('Error fetching referrer users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchReferrerUsers();
  }, [selectedReferrer, referrers]);

  // Fetch clients when referrer is selected and client type is existing
  useEffect(() => {
    const fetchClients = async () => {
      if (!selectedReferrer || clientType !== 'existing') {
        setClients([]);
        setSelectedClient('');
        return;
      }

      try {
        setIsLoadingClients(true);
        const referrer = referrers.find(r => r.id === selectedReferrer);
        if (!referrer) return;

        const response = await fetch(`/api/admin/clients?organizationId=${referrer.organisation_id}`);
        const data = await response.json();

        if (response.ok) {
          setClients(data.clients || []);
        } else {
          console.error('Failed to fetch clients:', data.error);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [selectedReferrer, clientType, referrers]);

  const handleLoanPurposeChange = (value: string) => {
    setOpportunityData(prev => ({
      ...prev,
      loanPurpose: value
    }));
  };


  // Calculate ICR and LVR whenever relevant fields change
  useEffect(() => {
    const parseNumber = (value: string): number => {
      if (!value) return 0;
      const cleaned = value.replace(/[₹$,]/g, '');
      return parseFloat(cleaned) || 0;
    };

    // Parse all financial values
    const netProfit = parseNumber(financialDetails.netProfitBeforeTax);
    const amortisation = parseNumber(financialDetails.amortisation);
    const depreciation = parseNumber(financialDetails.depreciation);
    const existingInterestCosts = parseNumber(financialDetails.existingInterestCosts);
    const rentalExpense = parseNumber(financialDetails.rentalExpense);
    const proposedRentalIncome = parseNumber(financialDetails.proposedRentalIncome);
    const loanAmount = parseNumber(opportunityData.loanAmount);
    const estimatedValue = parseNumber(opportunityData.estimatedPropertyValue);

    // Calculate LVR (Loan to Value Ratio)
    let calculatedLvr = 0;
    if (loanAmount > 0 && estimatedValue > 0) {
      calculatedLvr = (loanAmount / estimatedValue) * 100;
    }
    setLvr(calculatedLvr);

    // Calculate ICR (Interest Coverage Ratio)
    let calculatedIcr = 0;
    if (netProfit > 0 || amortisation > 0 || depreciation > 0 || existingInterestCosts > 0 || rentalExpense > 0 || proposedRentalIncome > 0) {
      const totalIncomeServicing = netProfit + amortisation + depreciation + existingInterestCosts + rentalExpense + proposedRentalIncome;
      const proposedInterestCost = loanAmount * (INTEREST_RATE / 100);
      const totalInterest = existingInterestCosts + proposedInterestCost;

      if (totalInterest > 0) {
        calculatedIcr = totalIncomeServicing / totalInterest;
      }
    }
    setIcr(calculatedIcr);

    // Determine outcome level based on ICR, LVR, and other questions
    let level = 0;
    let isGreen = false;

    // Count Yes/No answers in "Other Questions"
    const yesCount = [
      financialDetails.existingLiabilities,
      financialDetails.additionalSecurity,
      financialDetails.smsf,
      financialDetails.existingATO,
      financialDetails.creditIssues
    ].filter(q => q === 'yes').length;

    const noCount = [
      financialDetails.existingLiabilities,
      financialDetails.additionalSecurity,
      financialDetails.smsf,
      financialDetails.existingATO,
      financialDetails.creditIssues
    ].filter(q => q === 'no').length;

    // Apply outcome logic based on ICR and LVR
    if (calculatedIcr >= 2 && calculatedLvr <= 65) {
      level = 1; // Green
      isGreen = true;
    } else if (calculatedIcr >= 2 && calculatedLvr > 65 && calculatedLvr <= 80) {
      level = 2; // Yellow
    } else if (calculatedIcr >= 2 && calculatedLvr > 80) {
      level = 2; // Yellow
    } else if (calculatedIcr < 2 && calculatedLvr <= 65) {
      level = 2; // Yellow
    } else if (calculatedIcr < 2 && calculatedLvr > 65 && calculatedLvr <= 80) {
      level = 2; // Yellow
    } else if (calculatedIcr < 2 && calculatedLvr > 80) {
      level = 3; // Red
    }

    // If all questions are "No" and not already green, show green
    if (noCount === 5 && !isGreen) {
      level = 1;
      isGreen = true;
    }

    // If some questions are "No" and none are "Yes", show green
    if (noCount > 0 && yesCount === 0 && !isGreen) {
      level = 1;
      isGreen = true;
    }

    // If any question is "Yes" and was green, override to yellow
    if (yesCount > 0 && isGreen) {
      level = 2;
    }

    // If any question is "Yes", show yellow
    if (yesCount > 0) {
      level = 2;
    }

    // ICR < 1.5 always shows red (final override)
    if (calculatedIcr < 1.5 && calculatedIcr > 0) {
      level = 3;
    }

    setOutcomeLevel(level);
  }, [financialDetails, opportunityData, INTEREST_RATE]);

  const handleBack = () => {
    router.push('/admin/opportunities');
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    // Skip all validation for draft - just save whatever is filled
    if (!saveAsDraft) {
      // Validate required fields
      if (!selectedReferrer) {
        toast({
          title: "Validation Error",
          description: "Please select a referrer",
          variant: "destructive"
        });
        return;
      }

      if (!selectedUser) {
        toast({
          title: "Validation Error",
          description: "Please select a referrer user",
          variant: "destructive"
        });
        return;
      }

      // Validate client selection
      if (clientType === 'new') {
        if (!newClientData.firstName || !newClientData.lastName || !newClientData.mobile || !newClientData.email || !newClientData.briefOverview) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required client fields",
            variant: "destructive"
          });
          return;
        }
      } else {
        if (!selectedClient) {
          toast({
            title: "Validation Error",
            description: "Please select an existing client",
            variant: "destructive"
          });
          return;
        }
        if (!newClientData.briefOverview) {
          toast({
            title: "Validation Error",
            description: "Please provide a brief overview",
            variant: "destructive"
          });
          return;
        }
      }

      // Validate detailed loan information if provided
      if (hasMoreInfo === 'yes') {
        if (!opportunityData.loanAmount || !opportunityData.estimatedPropertyValue || !opportunityData.loanType) {
          toast({
            title: "Validation Error",
            description: "Please fill in loan amount, estimated property value, and loan type",
            variant: "destructive"
          });
          return;
        }

        if (!opportunityData.loanPurpose) {
          toast({
            title: "Validation Error",
            description: "Please select a loan purpose",
            variant: "destructive"
          });
          return;
        }
      }

      // Validate terms & conditions
      if (!termsAccepted.term1 || !termsAccepted.term2 || !termsAccepted.term3 || !termsAccepted.term4) {
        toast({
          title: "Validation Error",
          description: "Please accept all terms and conditions",
          variant: "destructive"
        });
        return;
      }
    }

    // Proceed with saving
    setIsSubmitting(true);

    try {
      // Get the organisation_id from the selected referrer
      const selectedReferrerData = referrers.find(r => r.id === selectedReferrer);
      if (!selectedReferrerData) {
        throw new Error('Selected referrer not found');
      }

      // Prepare form data
      const formData = {
        referrer_id: selectedReferrerData.organisation_id, // Use organisation_id, not user.id
        referrer_user_id: selectedUser,
        client_type: clientType,
        selected_client_id: clientType === 'existing' ? selectedClient : null,
        new_client_data: clientType === 'new' ? newClientData : null,
        brief_overview: newClientData.briefOverview,
        has_more_info: hasMoreInfo === 'yes',
        loan_amount: opportunityData.loanAmount,
        estimated_property_value: opportunityData.estimatedPropertyValue,
        loan_type: opportunityData.loanType,
        loan_purpose: opportunityData.loanPurpose,
        asset_type: opportunityData.assetType,
        asset_address: opportunityData.assetAddress,
        financial_details: financialDetails,
        icr: icr,
        lvr: lvr,
        outcome_level: outcomeLevel,
        additional_notes: additionalNotes,
        terms_accepted: termsAccepted,
        status: saveAsDraft ? 'draft' : 'opportunity'
      };

      console.log('Submitting form data:', formData);

      // Make API call to create opportunity
      const response = await fetch('/api/admin/opportunities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create opportunity');
      }

      const result = await response.json();

      toast({
        title: "Success!",
        description: saveAsDraft
          ? `Draft ${result.opportunity.opportunity_id} saved successfully`
          : `Opportunity ${result.opportunity.opportunity_id} created successfully`,
      });

      // Redirect to opportunities list
      router.push('/admin/opportunities');

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/opportunities');
  };

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add Opportunity</h1>
      </div>

      <div className="space-y-6">
        {/* Referrer Section */}
        <Card>
          <CardHeader>
            <CardTitle>Referrer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrer">
                Select Referrer <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedReferrer}
                onValueChange={setSelectedReferrer}
                disabled={isLoadingReferrers}
              >
                <SelectTrigger id="referrer">
                  <SelectValue placeholder={isLoadingReferrers ? "Loading referrers..." : "select"} />
                </SelectTrigger>
                <SelectContent>
                  {referrers.map((referrer) => (
                    <SelectItem key={referrer.id} value={referrer.id}>
                      {referrer.company_name} - {referrer.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-user">
                Select Referrer User <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedUser}
                onValueChange={setSelectedUser}
                disabled={!selectedReferrer || isLoadingUsers}
              >
                <SelectTrigger id="referrer-user">
                  <SelectValue
                    placeholder={
                      !selectedReferrer
                        ? "select"
                        : isLoadingUsers
                        ? "Loading users..."
                        : "select"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {referrerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.surname} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Client Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Is this a new or existing client</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={clientType}
              onValueChange={(value) => setClientType(value as 'new' | 'existing')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="new" id="new-client" />
                <Label htmlFor="new-client" className="cursor-pointer flex-1">
                  New Client
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="existing" id="existing-client" />
                <Label htmlFor="existing-client" className="cursor-pointer flex-1">
                  Existing Client
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Client Section */}
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientType === 'new' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Director First Name"
                      value={newClientData.firstName}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Director Surname"
                      value={newClientData.lastName}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">
                      Mobile <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mobile"
                      placeholder="Contact Phone"
                      value={newClientData.mobile}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, mobile: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Contact Email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                {/* ABN / GST No. Field */}
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN / GST No.</Label>
                  <Input
                    id="abn"
                    placeholder="ABN / GST No."
                    value={newClientData.abn}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, abn: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entityType">
                      Entity (Borrowing Entity Type)
                    </Label>
                    <Select
                      value={newClientData.entityType}
                      onValueChange={(value) => setNewClientData(prev => ({ ...prev, entityType: value }))}
                    >
                      <SelectTrigger id="entityType">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
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
                    <Label htmlFor="entityName">
                      Entity Name
                    </Label>
                    <Input
                      id="entityName"
                      placeholder="Entity Name"
                      value={newClientData.entityName}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, entityName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeInBusiness">
                    Time in Business
                  </Label>
                  <Input
                    id="timeInBusiness"
                    placeholder="e.g., 4 Years"
                    value={newClientData.timeInBusiness}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, timeInBusiness: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress" className="text-base font-semibold">
                    Company Address
                  </Label>
                  <AddressAutocomplete
                    value={newClientData.companyAddress}
                    onChange={(value: string, addressData?: AddressData) => {
                      if (addressData) {
                        setNewClientData(prev => ({
                          ...prev,
                          companyAddress: addressData.fullAddress,
                          companyStreetAddress: addressData.streetAddress,
                          companySuburb: addressData.suburb,
                          companyState: addressData.state,
                          companyPostcode: addressData.postcode,
                          companyCountry: addressData.country || 'IN'
                        }));
                      }
                    }}
                    streetAddress={newClientData.companyStreetAddress}
                    suburb={newClientData.companySuburb}
                    state={newClientData.companyState}
                    postcode={newClientData.companyPostcode}
                    country={newClientData.companyCountry}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">
                      Industry
                    </Label>
                    <Select
                      value={newClientData.industry}
                      onValueChange={(value) => setNewClientData(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
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
                  <Label htmlFor="briefOverview">
                    Brief Overview <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="briefOverview"
                    placeholder="Supply us with a few key details about the opportunity, including (if available) the client's funding purpose, security type and value, loan amount required, and any other material considerations. The more context you provide, the better positioned we are to support your client."
                    rows={5}
                    value={newClientData.briefOverview}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, briefOverview: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="select-client">
                    Select Client <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedClient}
                    onValueChange={setSelectedClient}
                    disabled={!selectedReferrer || isLoadingClients}
                  >
                    <SelectTrigger id="select-client">
                      <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client, index) => (
                        <SelectItem key={client.id || `client-${index}`} value={client.id}>
                          {client.entity_name} - {client.contact_first_name} {client.contact_last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="briefOverview">
                    Brief Overview <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="briefOverview"
                    placeholder="Supply us with a few key details about the opportunity, including (if available) the client's funding purpose, security type and value, loan amount required, and any other material considerations. The more context you provide, the better positioned we are to support your client."
                    rows={5}
                    value={newClientData.briefOverview}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, briefOverview: e.target.value }))}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detailed Opportunity Information */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Opportunity Information</CardTitle>
            <CardDescription>
              Opportunities require detailed loan information. If you do not have these details at this time, we can complete these details later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={hasMoreInfo}
              onValueChange={(value) => setHasMoreInfo(value as 'no' | 'yes')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="no" id="no-more-info" />
                <Label htmlFor="no-more-info" className="cursor-pointer">
                  I do not have further information at this time
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="yes" id="has-more-info" />
                <Label htmlFor="has-more-info" className="cursor-pointer">
                  I have more loan information
                </Label>
              </div>
            </RadioGroup>

            {hasMoreInfo === 'yes' && (
              <div className="mt-6 space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanAmount">
                      Loan Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="loanAmount"
                      placeholder="Loan Amount"
                      value={opportunityData.loanAmount}
                      onChange={(e) => setOpportunityData(prev => ({ ...prev, loanAmount: handleNumericInput(e.target.value) }))}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedPropertyValue">
                      Estimated property value <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="estimatedPropertyValue"
                      placeholder="Estimated property value"
                      value={opportunityData.estimatedPropertyValue}
                      onChange={(e) => setOpportunityData(prev => ({ ...prev, estimatedPropertyValue: handleNumericInput(e.target.value) }))}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetType">
                      Type of Asset
                    </Label>
                    <Select
                      value={opportunityData.assetType}
                      onValueChange={(value) => setOpportunityData(prev => ({ ...prev, assetType: value }))}
                    >
                      <SelectTrigger id="assetType">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial_property">Commercial Property</SelectItem>
                        <SelectItem value="residential_property">Residential Property</SelectItem>
                        <SelectItem value="vacant_land">Vacant Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assetAddress" className="text-base font-semibold">
                    Asset Address
                  </Label>
                  <AddressAutocomplete
                    value={opportunityData.assetAddress}
                    onChange={(value: string, addressData?: AddressData) => {
                      if (addressData) {
                        setOpportunityData(prev => ({
                          ...prev,
                          assetAddress: addressData.fullAddress,
                          assetStreetAddress: addressData.streetAddress,
                          assetSuburb: addressData.suburb,
                          assetState: addressData.state,
                          assetPostcode: addressData.postcode,
                          assetCountry: addressData.country || 'IN'
                        }));
                      }
                    }}
                    streetAddress={opportunityData.assetStreetAddress}
                    suburb={opportunityData.assetSuburb}
                    state={opportunityData.assetState}
                    postcode={opportunityData.assetPostcode}
                    country={opportunityData.assetCountry}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanType">
                    Loan Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={opportunityData.loanType}
                    onValueChange={(value) => setOpportunityData(prev => ({ ...prev, loanType: value }))}
                  >
                    <SelectTrigger id="loanType">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
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
                  <RadioGroup
                    value={opportunityData.loanPurpose}
                    onValueChange={handleLoanPurposeChange}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="purchase_owner_occupier" id="purchase_owner_occupier" />
                        <Label htmlFor="purchase_owner_occupier" className="cursor-pointer font-normal">
                          Purchase - Owner Occupier
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="purchase_investment" id="purchase_investment" />
                        <Label htmlFor="purchase_investment" className="cursor-pointer font-normal">
                          Purchase - Investment
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="refinance" id="refinance" />
                        <Label htmlFor="refinance" className="cursor-pointer font-normal">
                          Refinance
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="equity_release" id="equity_release" />
                        <Label htmlFor="equity_release" className="cursor-pointer font-normal">
                          Equity Release
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="land_bank" id="land_bank" />
                        <Label htmlFor="land_bank" className="cursor-pointer font-normal">
                          Land Bank
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="business_use" id="business_use" />
                        <Label htmlFor="business_use" className="cursor-pointer font-normal">
                          Business Use
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="commercial_equipment" id="commercial_equipment" />
                        <Label htmlFor="commercial_equipment" className="cursor-pointer font-normal">
                          Commercial Equipment
                        </Label>
                      </div>
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
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Funding</Label>
                <p className="text-sm text-muted-foreground">Will the property be funded solely from rental income?</p>
                <RadioGroup
                  value={financialDetails.fundedFromRental}
                  onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, fundedFromRental: value }))}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="yes" id="funded-yes" />
                    <Label htmlFor="funded-yes" className="cursor-pointer font-normal flex-1">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="no" id="funded-no" />
                    <Label htmlFor="funded-no" className="cursor-pointer font-normal flex-1">No</Label>
                  </div>
                </RadioGroup>

                {/* Conditional fields based on rental income answer */}
                {financialDetails.fundedFromRental === 'yes' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proposedRentalIncome">Proposed Rental Income (Annual)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="proposedRentalIncome"
                          type="text"
                          className="pl-7"
                          value={financialDetails.proposedRentalIncome}
                          onChange={(e) => setFinancialDetails(prev => ({ ...prev, proposedRentalIncome: handleNumericInput(e.target.value) }))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {financialDetails.fundedFromRental === 'no' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="netProfitBeforeTax">Net Profit Before Tax</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="netProfitBeforeTax"
                          type="text"
                          className="pl-7"
                          value={financialDetails.netProfitBeforeTax}
                          onChange={(e) => setFinancialDetails(prev => ({ ...prev, netProfitBeforeTax: handleNumericInput(e.target.value) }))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">Addbacks</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amortisation">Amortisation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="amortisation"
                            type="text"
                            className="pl-7"
                            value={financialDetails.amortisation}
                            onChange={(e) => setFinancialDetails(prev => ({ ...prev, amortisation: handleNumericInput(e.target.value) }))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="depreciation">Depreciation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="depreciation"
                            type="text"
                            className="pl-7"
                            value={financialDetails.depreciation}
                            onChange={(e) => setFinancialDetails(prev => ({ ...prev, depreciation: handleNumericInput(e.target.value) }))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="existingInterestCosts">Existing Interest Costs</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="existingInterestCosts"
                            type="text"
                            className="pl-7"
                            value={financialDetails.existingInterestCosts}
                            onChange={(e) => setFinancialDetails(prev => ({ ...prev, existingInterestCosts: handleNumericInput(e.target.value) }))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rentalExpense">Rental Expense</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="rentalExpense"
                            type="text"
                            className="pl-7"
                            value={financialDetails.rentalExpense}
                            onChange={(e) => setFinancialDetails(prev => ({ ...prev, rentalExpense: handleNumericInput(e.target.value) }))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proposedRentalIncomeNo">Proposed Rental Income (Annual)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="proposedRentalIncomeNo"
                          type="text"
                          className="pl-7"
                          value={financialDetails.proposedRentalIncome}
                          onChange={(e) => setFinancialDetails(prev => ({ ...prev, proposedRentalIncome: handleNumericInput(e.target.value) }))}
                          inputMode="numeric"
                        />
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
                    <RadioGroup
                      value={financialDetails.existingLiabilities}
                      onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, existingLiabilities: value }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="liabilities-yes" />
                        <Label htmlFor="liabilities-yes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="liabilities-no" />
                        <Label htmlFor="liabilities-no" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <p className="text-sm mb-2">Are you looking to offer up additional property security to support your equity position?</p>
                    <RadioGroup
                      value={financialDetails.additionalSecurity}
                      onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, additionalSecurity: value }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="security-yes" />
                        <Label htmlFor="security-yes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="security-no" />
                        <Label htmlFor="security-no" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <p className="text-sm mb-2">Is the application an SMSF structure?</p>
                    <RadioGroup
                      value={financialDetails.smsf}
                      onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, smsf: value }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="smsf-yes" />
                        <Label htmlFor="smsf-yes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="smsf-no" />
                        <Label htmlFor="smsf-no" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <p className="text-sm mb-2">Do you have any existing or overdue ATO / tax liabilities?</p>
                    <RadioGroup
                      value={financialDetails.existingATO}
                      onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, existingATO: value }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="ato-yes" />
                        <Label htmlFor="ato-yes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="ato-no" />
                        <Label htmlFor="ato-no" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <p className="text-sm mb-2">Do you have any credit file issues e.g. paid or unpaid defaults?</p>
                    <RadioGroup
                      value={financialDetails.creditIssues}
                      onValueChange={(value) => setFinancialDetails(prev => ({ ...prev, creditIssues: value }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="credit-yes" />
                        <Label htmlFor="credit-yes" className="cursor-pointer font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="credit-no" />
                        <Label htmlFor="credit-no" className="cursor-pointer font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Outcome Calculation Display */}
              <div className="space-y-4 pt-4 border-t">
                <h5 className="font-bold text-lg">Outcome</h5>

                {/* ICR and LVR Display */}
                {(icr > 0 || lvr > 0) && (
                  <div className="space-y-2">
                    {icr > 0 && (
                      <div className="text-sm font-medium">
                        ICR: {icr.toFixed(3)}
                      </div>
                    )}
                    {lvr > 0 && (
                      <div className="text-sm font-medium">
                        LVR: {lvr.toFixed(0)}
                      </div>
                    )}
                  </div>
                )}

                {/* Outcome Messages */}
                {outcomeLevel === 0 && (
                  <div className="bg-[#f0fdf4] border border-[#d1f4e0] rounded-lg p-4 text-sm text-muted-foreground">
                    Please complete the fields above to reveal an initial outcome.
                  </div>
                )}

                {outcomeLevel === 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-green-600 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-green-800 text-sm">
                      Deal looks good. Submit now!
                    </div>
                  </div>
                )}

                {outcomeLevel === 2 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-yellow-600 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-yellow-800 text-sm">
                      Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.
                    </div>
                  </div>
                )}

                {outcomeLevel === 3 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-red-600 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-red-800 text-sm">
                      Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <p className="text-sm text-muted-foreground">Please add any additional notes for this opportunity.</p>
                <Textarea
                  id="additionalNotes"
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms & Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="term1"
                checked={termsAccepted.term1}
                onCheckedChange={(checked) => setTermsAccepted(prev => ({ ...prev, term1: checked as boolean }))}
              />
              <Label htmlFor="term1" className="cursor-pointer font-normal leading-normal">
                I confirm that all the information being submitted is true and correct to my knowledge at the time of submission.
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="term2"
                checked={termsAccepted.term2}
                onCheckedChange={(checked) => setTermsAccepted(prev => ({ ...prev, term2: checked as boolean }))}
              />
              <Label htmlFor="term2" className="cursor-pointer font-normal leading-normal">
                I confirm that the client (on whose behalf I am submitting this application) is fully aware of and has consented to me submitting their information to Loanease, and that I have advised the client that Loanease will be making contact with them via email, text and/or call.
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="term3"
                checked={termsAccepted.term3}
                onCheckedChange={(checked) => setTermsAccepted(prev => ({ ...prev, term3: checked as boolean }))}
              />
              <Label htmlFor="term3" className="cursor-pointer font-normal leading-normal">
                I confirm that I have advised the client that I will be receiving a referral fee (upfront and/or trailing) from Loanease, for the loan I am submitting on their behalf, once the loan is settled.
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="term4"
                checked={termsAccepted.term4}
                onCheckedChange={(checked) => setTermsAccepted(prev => ({ ...prev, term4: checked as boolean }))}
              />
              <Label htmlFor="term4" className="cursor-pointer font-normal leading-normal">
                I confirm that I have advised the client that Loanease will charge a Service Fee in relation to their application and that this will be communicated directly to the client upon application.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="bg-[#00D37F] hover:bg-[#00bf72] text-white disabled:bg-[#00D37F]/50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Save & Submit Opportunity'}
          </Button>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="border-[#00D37F] text-[#00D37F] hover:bg-[#00D37F]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save and return later
          </Button>
          <Button
            variant="ghost"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
