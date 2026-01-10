'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, CheckCircle2, Circle, Download, FileText, FileDown, Eye, Clock, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/opportunity-utils';
import { AddressAutocomplete, AddressData } from '@/components/address-autocomplete';

interface OpportunityDetails {
  id: string;
  opportunity_id: string;
  status: string;
  created_at: string;
  external_ref?: string;

  // Client Details
  client_entity_type?: string;
  client_entity_name?: string;
  client_contact_name?: string;
  client_mobile?: string;
  client_email?: string;
  client_address?: string;
  client_abn?: string;
  client_time_in_business?: string;
  client_industry?: string;
  client_brief_overview?: string;

  // Loan Details
  loan_asset_type?: string;
  loan_asset_address?: string;
  loan_amount?: number;
  loan_property_value?: number;
  loan_type?: string;
  loan_purpose?: string;
  lender?: string;

  // Financial Details
  rental_income?: string;
  net_profit?: number;
  amortisation?: number;
  depreciation?: number;
  existing_interest?: number;
  rental_expense?: number;
  proposed_rental_income?: number;
  existing_liabilities?: string;
  additional_security?: string;
  smsf_structure?: string;
  ato_liabilities?: string;
  credit_issues?: string;
  icr?: number;
  lvr?: number;
  additional_notes?: string;

  // Other
  target_settlement_date?: string;
  date_settled?: string;
  notes?: string;
  declined_reason?: string;
  completed_declined_reason?: string;
  withdrawn_reason?: string;

  // Deal Finalisation
  loan_acc_ref_no?: string;
  flex_id?: string;
  payment_received_date?: string;
  payment_amount?: number;
  deal_finalisation_status?: string;

  // Related
  referrer_group?: string;
  team_member?: string;
  organization_id?: string;
  created_by?: string;
  client_id?: string;
  is_unqualified?: number;
  unqualified_reason?: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  action: string;
  field_name: string | null;
  old_value: any;
  new_value: any;
  description: string;
  user_name: string;
  ip_address: string;
}

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dialog states
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false);
  const [financialDetailsOpen, setFinancialDetailsOpen] = useState(false);
  const [externalRefOpen, setExternalRefOpen] = useState(false);
  const [targetDateOpen, setTargetDateOpen] = useState(false);
  const [settledDateOpen, setSettledDateOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [declinedReasonOpen, setDeclinedReasonOpen] = useState(false);
  const [completedDeclinedReasonOpen, setCompletedDeclinedReasonOpen] = useState(false);
  const [withdrawnReasonOpen, setWithdrawnReasonOpen] = useState(false);
  const [unqualifiedReasonOpen, setUnqualifiedReasonOpen] = useState(false);
  const [editReferrerDetailsOpen, setEditReferrerDetailsOpen] = useState(false);
  const [clearTargetDateOpen, setClearTargetDateOpen] = useState(false);
  const [clearSettledDateOpen, setClearSettledDateOpen] = useState(false);
  const [dealFinalisationOpen, setDealFinalisationOpen] = useState(false);

  // Deal Finalisation form state
  const [loanAccRefNo, setLoanAccRefNo] = useState('');
  const [flexId, setFlexId] = useState('');
  const [paymentReceivedDate, setPaymentReceivedDate] = useState<Date>();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Form states
  const [externalRef, setExternalRef] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [settledDate, setSettledDate] = useState<Date>();
  const [pendingStatus, setPendingStatus] = useState('');
  const [declinedReason, setDeclinedReason] = useState('');
  const [completedDeclinedReason, setCompletedDeclinedReason] = useState('');
  const [withdrawnReason, setWithdrawnReason] = useState('');
  const [unqualifiedReason, setUnqualifiedReason] = useState('');

  // Referrer details state
  const [referrerUsers, setReferrerUsers] = useState<any[]>([]);
  const [selectedReferrerUser, setSelectedReferrerUser] = useState('');

  // Client Details form state
  const [clientEntityType, setClientEntityType] = useState('');
  const [clientEntityName, setClientEntityName] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientAbn, setClientAbn] = useState('');
  const [clientTimeInBusiness, setClientTimeInBusiness] = useState('');
  const [clientIndustry, setClientIndustry] = useState('');
  const [clientBriefOverview, setClientBriefOverview] = useState('');

  // Loan Details form state
  const [loanAssetType, setLoanAssetType] = useState('');
  const [loanAssetAddress, setLoanAssetAddress] = useState('');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [loanPropertyValue, setLoanPropertyValue] = useState<number>(0);
  const [loanType, setLoanType] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [lender, setLender] = useState('');

  // Financial Details form state
  const [rentalIncomeFunding, setRentalIncomeFunding] = useState<string>('no');
  const [netProfit, setNetProfit] = useState<number | undefined>(undefined);
  const [amortisation, setAmortisation] = useState<number | undefined>(undefined);
  const [depreciation, setDepreciation] = useState<number | undefined>(undefined);
  const [existingInterest, setExistingInterest] = useState<number | undefined>(undefined);
  const [rentalExpense, setRentalExpense] = useState<number | undefined>(undefined);
  const [proposedRentalIncome, setProposedRentalIncome] = useState<number | undefined>(undefined);
  const [existingLiabilities, setExistingLiabilities] = useState<string>('no');
  const [additionalSecurity, setAdditionalSecurity] = useState<string>('no');
  const [smsfStructure, setSmsfStructure] = useState<string>('no');
  const [atoLiabilities, setAtoLiabilities] = useState<string>('no');
  const [creditIssues, setCreditIssues] = useState<string>('no');
  const [icr, setIcr] = useState<number>(0);
  const [lvr, setLvr] = useState<number>(0);

  useEffect(() => {
    if (params.id) {
      fetchOpportunityDetails();
    }
  }, [params.id]);

  // Fetch history when tab changes to history
  useEffect(() => {
    if (activeTab === 'history' && params.id && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab, params.id]);

  // Auto-calculate ICR and LVR when financial details change
  const INTEREST_RATE = 12.5;
  useEffect(() => {
    // Calculate LVR
    if (loanAmount > 0 && loanPropertyValue > 0) {
      const calculatedLvr = (loanAmount / loanPropertyValue) * 100;
      setLvr(calculatedLvr);
    }

    // Calculate ICR
    if (rentalIncomeFunding === 'yes') {
      // For rental income funding, use proposed rental income for ICR
      if (proposedRentalIncome && proposedRentalIncome > 0 && loanAmount > 0) {
        const proposedInterest = loanAmount * (INTEREST_RATE / 100);
        if (proposedInterest > 0) {
          setIcr(proposedRentalIncome / proposedInterest);
        }
      }
    } else {
      // Standard ICR calculation
      const finalNetProfit = netProfit || 0;
      const finalAmortisation = amortisation || 0;
      const finalDepreciation = depreciation || 0;
      const finalExistingInterest = existingInterest || 0;
      const finalRentalExpense = rentalExpense || 0;
      const finalProposedRentalIncome = proposedRentalIncome || 0;

      const totalIncomeServicing = finalNetProfit + finalAmortisation + finalDepreciation + finalExistingInterest + finalRentalExpense + finalProposedRentalIncome;
      const proposedInterest = loanAmount > 0 ? loanAmount * (INTEREST_RATE / 100) : 0;
      const totalInterest = finalExistingInterest + proposedInterest;

      if (totalInterest > 0) {
        setIcr(totalIncomeServicing / totalInterest);
      }
    }
  }, [loanAmount, loanPropertyValue, netProfit, amortisation, depreciation, existingInterest, rentalExpense, proposedRentalIncome, rentalIncomeFunding]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/history`);
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load history',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Re-populate form state when opportunity data changes
  useEffect(() => {
    if (opportunity) {
      console.log('Updating form state with opportunity:', opportunity);
      setClientEntityType(opportunity.client_entity_type || '');
      setClientEntityName(opportunity.client_entity_name || '');
      setClientContactName(opportunity.client_contact_name || '');
      setClientMobile(opportunity.client_mobile || '');
      setClientEmail(opportunity.client_email || '');
      setClientAddress(opportunity.client_address || '');
      setClientAbn(opportunity.client_abn || '');
      setClientTimeInBusiness(opportunity.client_time_in_business || '');
      setClientIndustry(opportunity.client_industry || '');
      setClientBriefOverview(opportunity.client_brief_overview || '');

      setLoanAssetType(opportunity.loan_asset_type || '');
      setLoanAssetAddress(opportunity.loan_asset_address || '');
      setLoanAmount(opportunity.loan_amount || 0);
      setLoanPropertyValue(opportunity.loan_property_value || 0);
      setLoanType(opportunity.loan_type || '');
      setLoanPurpose(opportunity.loan_purpose || '');
      setLender(opportunity.lender || '');

      setRentalIncomeFunding((opportunity.rental_income || 'no').toLowerCase());
      setNetProfit(opportunity.net_profit !== 0 ? opportunity.net_profit : undefined);
      setAmortisation(opportunity.amortisation !== 0 ? opportunity.amortisation : undefined);
      setDepreciation(opportunity.depreciation !== 0 ? opportunity.depreciation : undefined);
      setExistingInterest(opportunity.existing_interest !== 0 ? opportunity.existing_interest : undefined);
      setRentalExpense(opportunity.rental_expense !== 0 ? opportunity.rental_expense : undefined);
      setProposedRentalIncome(opportunity.proposed_rental_income !== 0 ? opportunity.proposed_rental_income : undefined);
      setExistingLiabilities((opportunity.existing_liabilities || 'no').toLowerCase());
      setAdditionalSecurity((opportunity.additional_security || 'no').toLowerCase());
      setSmsfStructure((opportunity.smsf_structure || 'no').toLowerCase());
      setAtoLiabilities((opportunity.ato_liabilities || 'no').toLowerCase());
      setCreditIssues((opportunity.credit_issues || 'no').toLowerCase());
      setIcr(opportunity.icr || 0);
      setLvr(opportunity.lvr || 0);
    }
  }, [opportunity]);

  const fetchOpportunityDetails = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        const opp = data.opportunity;
        setOpportunity(opp);
        setExternalRef(opp.external_ref || '');
        if (opp.target_settlement_date) {
          setTargetDate(new Date(opp.target_settlement_date));
        }
        if (opp.date_settled) {
          setSettledDate(new Date(opp.date_settled));
        }

        // Initialize deal finalisation form state
        setLoanAccRefNo(opp.loan_acc_ref_no || '');
        setFlexId(opp.flex_id || '');
        if (opp.payment_received_date) {
          setPaymentReceivedDate(new Date(opp.payment_received_date));
        }
        setPaymentAmount(opp.payment_amount || 0);

        // Initialize client details form state
        setClientEntityType(opp.client_entity_type || '');
        setClientEntityName(opp.client_entity_name || '');
        setClientContactName(opp.client_contact_name || '');
        setClientMobile(opp.client_mobile || '');
        setClientEmail(opp.client_email || '');
        setClientAddress(opp.client_address || '');
        setClientAbn(opp.client_abn || '');
        setClientTimeInBusiness(opp.client_time_in_business || '');
        setClientIndustry(opp.client_industry || '');
        setClientBriefOverview(opp.client_brief_overview || '');

        // Initialize loan details form state
        setLoanAssetType(opp.loan_asset_type || '');
        setLoanAssetAddress(opp.loan_asset_address || '');
        setLoanAmount(opp.loan_amount || 0);
        setLoanPropertyValue(opp.loan_property_value || 0);
        setLoanType(opp.loan_type || '');
        setLoanPurpose(opp.loan_purpose || '');
        setLender(opp.lender || '');

        // Initialize financial details form state
        setRentalIncomeFunding(opp.rental_income || 'no');
        setNetProfit(opp.net_profit !== 0 ? opp.net_profit : undefined);
        setAmortisation(opp.amortisation !== 0 ? opp.amortisation : undefined);
        setDepreciation(opp.depreciation !== 0 ? opp.depreciation : undefined);
        setExistingInterest(opp.existing_interest !== 0 ? opp.existing_interest : undefined);
        setRentalExpense(opp.rental_expense !== 0 ? opp.rental_expense : undefined);
        setProposedRentalIncome(opp.proposed_rental_income !== 0 ? opp.proposed_rental_income : undefined);
        setExistingLiabilities(opp.existing_liabilities || 'no');
        setAdditionalSecurity(opp.additional_security || 'no');
        setSmsfStructure(opp.smsf_structure || 'no');
        setAtoLiabilities(opp.ato_liabilities || 'no');
        setCreditIssues(opp.credit_issues || 'no');
        setIcr(opp.icr || 0);
        setLvr(opp.lvr || 0);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load opportunity details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load opportunity details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExternalRef = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_ref: externalRef }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'External reference updated successfully',
        });
        setExternalRefOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update external reference',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTargetDate = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_settlement_date: targetDate?.toISOString() }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Target settlement date updated successfully',
        });
        setTargetDateOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update target settlement date',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSettledDate = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_settled: settledDate?.toISOString() }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Date settled updated successfully',
        });
        setSettledDateOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update date settled',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleClearTargetDate = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_settlement_date: null }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Target settlement date cleared successfully',
        });
        setClearTargetDateOpen(false);
        setTargetDate(undefined);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to clear target settlement date',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleClearSettledDate = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_settled: null }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Date settled cleared successfully',
        });
        setClearSettledDateOpen(false);
        setSettledDate(undefined);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to clear date settled',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDealFinalisation = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_acc_ref_no: loanAccRefNo,
          flex_id: flexId,
          payment_received_date: paymentReceivedDate?.toISOString(),
          payment_amount: paymentAmount,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Deal finalisation saved successfully',
        });
        setDealFinalisationOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save deal finalisation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleFinaliseAndComplete = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_acc_ref_no: loanAccRefNo,
          flex_id: flexId,
          payment_received_date: paymentReceivedDate?.toISOString(),
          payment_amount: paymentAmount,
          deal_finalisation_status: 'Closed',
          finalise_complete: true, // Flag to create special audit log
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Deal finalisation completed successfully',
        });
        setDealFinalisationOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to complete deal finalisation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveClientDetails = async () => {
    try {
      // Update opportunity fields (entity_type, industry, etc.)
      const oppResponse = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Opportunities table fields
          entity_type: clientEntityType,
          industry: clientIndustry,
          abn: clientAbn,

          // Opportunity_details table fields
          client_address: clientAddress,
          time_in_business: clientTimeInBusiness,
          brief_overview: clientBriefOverview,
        }),
      });

      if (!oppResponse.ok) {
        toast({
          title: 'Error',
          description: 'Failed to update opportunity details',
          variant: 'destructive',
        });
        return;
      }

      // Update client fields (email, mobile, contact name, entity name)
      // These are stored on the clients table, not opportunities
      if (opportunity?.client_id) {
        // Split contact name into first and last name
        const nameParts = (clientContactName || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const clientResponse = await fetch(`/api/admin/clients/${opportunity.client_id}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_name: clientEntityName,
            contact_first_name: firstName,
            contact_last_name: lastName,
            contact_phone: clientMobile,
            contact_email: clientEmail,
          }),
        });

        if (!clientResponse.ok) {
          toast({
            title: 'Warning',
            description: 'Opportunity updated but client contact info may not have saved',
            variant: 'destructive',
          });
          setClientDetailsOpen(false);
          fetchOpportunityDetails();
          return;
        }
      }

      toast({
        title: 'Success',
        description: 'Client details updated successfully',
      });
      setClientDetailsOpen(false);
      fetchOpportunityDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveLoanDetails = async () => {
    try {
      // Calculate LVR automatically
      let calculatedLvr = lvr;
      if (loanAmount > 0 && loanPropertyValue > 0) {
        calculatedLvr = (loanAmount / loanPropertyValue) * 100;
      }

      // Recalculate ICR since loan amount affects it
      let calculatedIcr = icr;
      if (rentalIncomeFunding === 'yes') {
        // For rental income funding, use proposed rental income for ICR
        if (proposedRentalIncome && proposedRentalIncome > 0 && loanAmount > 0) {
          const proposedInterest = loanAmount * (INTEREST_RATE / 100);
          if (proposedInterest > 0) {
            calculatedIcr = proposedRentalIncome / proposedInterest;
          }
        }
      } else {
        // Standard ICR calculation
        const finalNetProfit = netProfit || 0;
        const finalAmortisation = amortisation || 0;
        const finalDepreciation = depreciation || 0;
        const finalExistingInterest = existingInterest || 0;
        const finalRentalExpense = rentalExpense || 0;
        const finalProposedRentalIncome = proposedRentalIncome || 0;

        const totalIncomeServicing = finalNetProfit + finalAmortisation + finalDepreciation + finalExistingInterest + finalRentalExpense + finalProposedRentalIncome;
        const proposedInterest = loanAmount > 0 ? loanAmount * (INTEREST_RATE / 100) : 0;
        const totalInterest = finalExistingInterest + proposedInterest;

        if (totalInterest > 0) {
          calculatedIcr = totalIncomeServicing / totalInterest;
        }
      }

      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Opportunities table fields
          loan_amount: loanAmount,
          property_value: loanPropertyValue,
          asset_type: loanAssetType,
          asset_address: loanAssetAddress,
          loan_type: loanType,
          loan_purpose: loanPurpose,
          lender: lender,
          lvr: calculatedLvr, // Auto-calculated LVR
          icr: calculatedIcr, // Auto-calculated ICR
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Loan details updated successfully',
        });
        setLoanDetailsOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update loan details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFinancialDetails = async () => {
    try {
      // Parse the notes JSON to update financial-related fields
      let currentNotes: any = {};
      if (opportunity?.notes) {
        try {
          currentNotes = JSON.parse(opportunity.notes);
        } catch (e) {
          currentNotes = {};
        }
      }

      // If rental income funding is "yes", clear the addbacks fields
      let finalNetProfit = netProfit || 0;
      let finalAmortisation = amortisation || 0;
      let finalDepreciation = depreciation || 0;
      let finalExistingInterest = existingInterest || 0;
      let finalRentalExpense = rentalExpense || 0;

      if (rentalIncomeFunding === 'yes') {
        // Clear all addbacks fields when funded solely from rental income
        finalNetProfit = 0;
        finalAmortisation = 0;
        finalDepreciation = 0;
        finalExistingInterest = 0;
        finalRentalExpense = 0;

        // Also clear the state variables so they don't show up if user switches back
        setNetProfit(undefined);
        setAmortisation(undefined);
        setDepreciation(undefined);
        setExistingInterest(undefined);
        setRentalExpense(undefined);
      }

      // Calculate ICR automatically using correct formula
      let calculatedIcr = icr;
      if (rentalIncomeFunding === 'yes') {
        // For rental income funding, use proposed rental income for ICR
        if (proposedRentalIncome && proposedRentalIncome > 0 && loanAmount > 0) {
          const proposedInterest = loanAmount * (INTEREST_RATE / 100);
          if (proposedInterest > 0) {
            calculatedIcr = proposedRentalIncome / proposedInterest;
          }
        }
      } else {
        // Standard ICR calculation
        const totalIncomeServicing = finalNetProfit + finalAmortisation + finalDepreciation + finalExistingInterest + finalRentalExpense + (proposedRentalIncome || 0);
        const proposedInterest = loanAmount > 0 ? loanAmount * (INTEREST_RATE / 100) : 0;
        const totalInterest = finalExistingInterest + proposedInterest;

        if (totalInterest > 0) {
          calculatedIcr = totalIncomeServicing / totalInterest;
        }
      }

      // Calculate LVR automatically
      let calculatedLvr = lvr;
      if (loanAmount > 0 && loanPropertyValue > 0) {
        calculatedLvr = (loanAmount / loanPropertyValue) * 100;
      }

      // Send financial details as individual fields to opportunity_details table
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Opportunities table fields
          icr: calculatedIcr, // Auto-calculated ICR
          lvr: calculatedLvr, // Auto-calculated LVR

          // Opportunity_details table fields
          rental_income: rentalIncomeFunding,
          net_profit: finalNetProfit,
          ammortisation: finalAmortisation, // Note: column name is ammortisation
          deprecition: finalDepreciation, // Note: column name is deprecition
          existing_interest_costs: finalExistingInterest,
          rental_expense: finalRentalExpense,
          proposed_rental_income: proposedRentalIncome || 0,
          existing_liabilities: existingLiabilities, // Will be converted to 1/0
          additional_property: additionalSecurity, // Note: column name is additional_property
          smsf_structure: smsfStructure,
          ato_liabilities: atoLiabilities,
          credit_file_issues: creditIssues, // Note: column name is credit_file_issues
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Financial details updated successfully',
        });
        setFinancialDetailsOpen(false);
        fetchOpportunityDetails();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update financial details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleStatusClick = (status: string, reasonType?: 'decision_declined' | 'completed_declined' | 'withdrawn') => {
    setPendingStatus(status);

    // For declined status in Application Decision, show reason dialog
    if (reasonType === 'decision_declined') {
      setDeclinedReasonOpen(true);
    }
    // For declined status in Application Completed, show reason dialog
    else if (reasonType === 'completed_declined') {
      setCompletedDeclinedReasonOpen(true);
    }
    // For withdrawn status, show reason dialog
    else if (reasonType === 'withdrawn') {
      setWithdrawnReasonOpen(true);
    }
    // For other statuses, show confirmation dialog
    else {
      setStatusConfirmOpen(true);
    }
  };

  const handleStatusConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: 'Success',
        description: 'Opportunity status updated successfully',
      });

      setStatusConfirmOpen(false);
      setPendingStatus('');
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update opportunity status',
        variant: 'destructive',
      });
    }
  };

  const handleDeclinedReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          declined_reason: declinedReason
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: 'Success',
        description: 'Opportunity status updated successfully',
      });

      setDeclinedReasonOpen(false);
      setDeclinedReason('');
      setPendingStatus('');
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update opportunity status',
        variant: 'destructive',
      });
    }
  };

  const handleCompletedDeclinedReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          completed_declined_reason: completedDeclinedReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to update status');
      }

      toast({
        title: 'Success',
        description: 'Opportunity status updated successfully',
      });

      setCompletedDeclinedReasonOpen(false);
      setCompletedDeclinedReason('');
      setPendingStatus('');
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update opportunity status',
        variant: 'destructive',
      });
    }
  };

  const handleWithdrawnReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          withdrawn_reason: withdrawnReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to update status');
      }

      toast({
        title: 'Success',
        description: 'Opportunity status updated successfully',
      });

      setWithdrawnReasonOpen(false);
      setWithdrawnReason('');
      setPendingStatus('');
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update opportunity status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Opportunity deleted successfully',
        });
        // Redirect to opportunities list after deletion
        router.push('/admin/opportunities');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete opportunity');
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete opportunity',
        variant: 'destructive',
      });
    }
  };

  const handleMarkUnqualified = () => {
    setUnqualifiedReason('');
    setUnqualifiedReasonOpen(true);
  };

  const handleUnqualifiedReasonConfirm = async () => {
    if (!unqualifiedReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason to disqualify the opportunity',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save unqualified fields to opportunity_details table
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          is_unqualified: 1, // 1 = Yes/Unqualified
          unqualified_date: new Date().toISOString(),
          unqualified_reason: unqualifiedReason,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Opportunity marked as unqualified',
        });
        setUnqualifiedReasonOpen(false);
        setUnqualifiedReason('');
        // Refresh the opportunity data
        fetchOpportunityDetails();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as unqualified');
      }
    } catch (error) {
      console.error('Error marking opportunity as unqualified:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as unqualified',
        variant: 'destructive',
      });
    }
  };

  const handleOpenEditReferrerDetails = async () => {
    if (!opportunity?.organization_id) return;

    try {
      // Fetch users for this referrer organization
      const response = await fetch(`/api/admin/referrers/${opportunity.organization_id}/users`);
      if (response.ok) {
        const data = await response.json();
        setReferrerUsers(data.users || []);
        setSelectedReferrerUser(opportunity.created_by || '');
        setEditReferrerDetailsOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch referrer users',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching referrer users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch referrer users',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReferrerUser = async () => {
    if (!selectedReferrerUser) {
      toast({
        title: 'Error',
        description: 'Please select a team member',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_by: selectedReferrerUser,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Team member updated successfully',
        });
        setEditReferrerDetailsOpen(false);
        // Refresh the opportunity data
        fetchOpportunityDetails();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update team member');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update team member',
        variant: 'destructive',
      });
    }
  };

  const formatStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'application_created': 'Application Created',
      'application_submitted': 'Application Submitted',
      'conditionally_approved': 'Conditionally Approved',
      'approved': 'Approved',
      'declined': 'Declined',
      'settled': 'Settled',
      'completed_declined': 'Declined',
      'withdrawn': 'Withdrawn',
    };
    return statusMap[status] || status;
  };

  const getProgressPercentage = (status: string) => {
    const statusOrder: { [key: string]: number } = {
      'draft': 10,
      'opportunity': 20,
      'application_created': 40,
      'application_submitted': 60,
      'conditionally_approved': 80,
      'approved': 80,
      'declined': 80,
      'settled': 100,
      'completed_declined': 100,
      'withdrawn': 100,
    };
    return statusOrder[status?.toLowerCase()] || 20;
  };

  const isStatusCompleted = (checkStatus: string, currentStatus: string) => {
    const statusOrder = [
      'opportunity',
      'application_created',
      'application_submitted',
      'conditionally_approved',
      'approved',
      'declined',
      'settled',
      'completed_declined',
      'withdrawn'
    ];

    const checkIndex = statusOrder.indexOf(checkStatus);
    const currentIndex = statusOrder.indexOf(currentStatus?.toLowerCase());

    return currentIndex >= checkIndex && checkIndex !== -1;
  };

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading opportunity details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Opportunity not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'opportunity':
        return 'bg-[#00D37F] text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEntityType = (entityType: string) => {
    const types: { [key: string]: string } = {
      'private_company': 'Private Company',
      'public_company': 'Public Company',
      'sole_trader': 'Sole Trader',
      'partnership': 'Partnership',
      'trust': 'Trust',
      'individual': 'Individual',
    };
    return types[entityType] || entityType;
  };

  const formatAssetType = (assetType: string) => {
    const types: { [key: string]: string } = {
      'commercial_property': 'Commercial Property',
      'residential_property': 'Residential Property',
      'vacant_land': 'Vacant Land',
    };
    return types[assetType] || assetType;
  };

  const formatIndustry = (industry: string) => {
    const industries: { [key: string]: string } = {
      'arts_and_lifestyle': 'Arts and Lifestyle',
      'building_and_trade': 'Building and Trade',
      'financial_services_and_insurance': 'Financial Services and Insurance',
      'hair_and_beauty': 'Hair and Beauty',
      'health': 'Health',
      'hospitality': 'Hospitality',
      'manufacturing': 'Manufacturing',
      'agriculture_farming_and_mining': 'Agriculture, Farming and Mining',
      'real_estate_and_property_management': 'Real Estate and Property Management',
      'services': 'Services',
      'professional_services': 'Professional Services',
      'retail': 'Retail',
      'transport_and_automotive': 'Transport and Automotive',
      'wholesaling': 'Wholesaling',
    };
    return industries[industry] || industry;
  };

  const formatLoanType = (loanType: string) => {
    const types: { [key: string]: string } = {
      'construction': 'Construction',
      'lease_doc': 'Lease Doc',
      'low_doc': 'Low Doc',
      'private_short_term': 'Private/Short Term',
      'unsure': 'Unsure',
    };
    return types[loanType] || loanType;
  };

  const formatLoanPurpose = (loanPurpose: string) => {
    const purposes: { [key: string]: string } = {
      'purchase_owner_occupier': 'Purchase Owner Occupier',
      'purchase_investment': 'Purchase Investment',
      'refinance': 'Refinance',
      'equity_release': 'Equity Release',
      'land_bank': 'Land Bank',
      'business_use': 'Business Use',
      'commercial_equipment': 'Commercial Equipment',
    };
    return purposes[loanPurpose] || loanPurpose;
  };

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(opportunity.is_unqualified == 1 ? '/admin/opportunities/unqualified' : '/admin/opportunities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Circle className="h-8 w-8 text-gray-400" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#02383B]">{opportunity.opportunity_id}</h1>
              <span className="text-sm text-gray-600">{opportunity.client_entity_name || '-'}</span>
              {opportunity.external_ref && (
                <span className="text-sm text-gray-600">Ref: {opportunity.external_ref}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/admin/opportunities/${params.id}/export/csv`, '_blank')}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/api/admin/opportunities/${params.id}/export/pdf`, '_blank')}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {/* Hide Unqualified and External Ref buttons if already unqualified */}
          {opportunity.is_unqualified !== 1 && (
            <>
              <Button
                variant="outline"
                onClick={handleMarkUnqualified}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                Unqualified
              </Button>
              <Button
                variant="outline"
                onClick={() => setExternalRefOpen(true)}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                {opportunity.external_ref ? 'Edit External Ref #' : 'Add External Ref #'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Referrer Group and Team Member Section */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow p-4">
        <div className="flex items-center gap-8">
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Referrer Group:</span>{' '}
            <span className="text-gray-900">{opportunity.referrer_group || '-'}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Team Member:</span>{' '}
            <button
              onClick={handleOpenEditReferrerDetails}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {opportunity.team_member || '-'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Badge and Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <span className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(opportunity.status)}`}>
                  {formatStatusDisplay(opportunity.status) || 'Draft'}
                </span>
              </div>
            </div>

            <div className="flex gap-4 border-b">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                History
              </button>
            </div>
          </div>

          {/* History Tab Content */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-6">Activity History</h3>
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No history records found</div>
              ) : (
                <div className="space-y-0">
                  {history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-6 py-4 ${
                        index !== history.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="w-32 shrink-0">
                        <p className="font-semibold text-gray-900">
                          {new Date(entry.date).toLocaleDateString('en-AU', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-500">{entry.time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          {entry.description}
                          <span className="text-gray-500"> by </span>
                          <span className="font-medium">{entry.user_name}</span>
                        </p>
                      </div>
                      <div className="w-32 shrink-0 text-right">
                        <p className="text-sm text-gray-500">{entry.ip_address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
          <>
          {/* Client Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Client Details</h3>
              {/* Hide edit icon for unqualified opportunities */}
              {opportunity.is_unqualified !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClientDetailsOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Borrowing Entity Type</p>
                <p className="font-medium">{opportunity.client_entity_type ? formatEntityType(opportunity.client_entity_type) : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-600">Borrowing Entity Name</p>
                <p className="font-medium text-green-600">{opportunity.client_entity_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Borrower Contact</p>
                <p className="font-medium">{opportunity.client_contact_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Mobile</p>
                <p className="font-medium">{opportunity.client_mobile || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{opportunity.client_email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Company Address</p>
                <p className="font-medium">{opportunity.client_address || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">ABN</p>
                <p className="font-medium">{opportunity.client_abn || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Time in business</p>
                <p className="font-medium">{opportunity.client_time_in_business || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Industry</p>
                <p className="font-medium">{opportunity.client_industry ? formatIndustry(opportunity.client_industry) : 'Not specified'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Brief Overview</p>
                <p className="font-medium">{opportunity.client_brief_overview || ''}</p>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Loan Details</h3>
              {/* Hide edit icon for unqualified opportunities */}
              {opportunity.is_unqualified !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLoanDetailsOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Type of asset</p>
                <p className="font-medium">{opportunity.loan_asset_type ? formatAssetType(opportunity.loan_asset_type) : ''}</p>
              </div>
              <div>
                <p className="text-gray-600">Asset Address</p>
                <p className="font-medium">{opportunity.loan_asset_address || ''}</p>
              </div>
              <div>
                <p className="text-gray-600">Loan Amount</p>
                <p className="font-medium">${opportunity.loan_amount?.toLocaleString() || '$4,564'}</p>
              </div>
              <div>
                <p className="text-gray-600">Estimated property value</p>
                <p className="font-medium">${opportunity.loan_property_value?.toLocaleString() || '$545'}</p>
              </div>
              <div>
                <p className="text-gray-600">Loan Type</p>
                <p className="font-medium">{opportunity.loan_type ? formatLoanType(opportunity.loan_type) : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-600">Loan Purpose</p>
                <p className="font-medium">{opportunity.loan_purpose ? formatLoanPurpose(opportunity.loan_purpose) : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-600">Lender</p>
                <p className="font-medium">{opportunity.lender || ''}</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Financial Details</h3>
              {/* Hide edit icon for unqualified opportunities */}
              {opportunity.is_unqualified !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFinancialDetailsOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-gray-600">Will the property be funded solely from rental income?</p>
                <p className="font-medium">{opportunity.rental_income === 'yes' ? 'Yes' : 'No'}</p>
              </div>

              {/* Show these fields only when rental_income is 'no' */}
              {opportunity.rental_income !== 'yes' && (
                <>
                  <div>
                    <p className="text-gray-600">Net Profit Before Tax</p>
                    <p className="font-medium">{opportunity.net_profit && opportunity.net_profit !== 0 ? `$${opportunity.net_profit.toLocaleString()}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Amortisation</p>
                    <p className="font-medium">{opportunity.amortisation && opportunity.amortisation !== 0 ? `$${opportunity.amortisation.toLocaleString()}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Depreciation</p>
                    <p className="font-medium">{opportunity.depreciation && opportunity.depreciation !== 0 ? `$${opportunity.depreciation.toLocaleString()}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Existing Interest Costs</p>
                    <p className="font-medium">{opportunity.existing_interest && opportunity.existing_interest !== 0 ? `$${opportunity.existing_interest.toLocaleString()}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Rental Expense</p>
                    <p className="font-medium">{opportunity.rental_expense && opportunity.rental_expense !== 0 ? `$${opportunity.rental_expense.toLocaleString()}` : 'Not specified'}</p>
                  </div>
                </>
              )}

              {/* Show Proposed Rental Income for both Yes and No */}
              <div>
                <p className="text-gray-600">Proposed Rental income (Annual)</p>
                <p className="font-medium">{opportunity.proposed_rental_income && opportunity.proposed_rental_income !== 0 ? `$${opportunity.proposed_rental_income.toLocaleString()}` : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-600">Does your business and /or the borrowing entity have any existing liabilities?</p>
                <p className="font-medium">{opportunity.existing_liabilities || 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">Are you looking to offer up additional property security to support your equity position?</p>
                <p className="font-medium">{opportunity.additional_security || 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">Is the application an SMSF structure?</p>
                <p className="font-medium">{opportunity.smsf_structure || 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">Do you have any existing or overdue ATO / tax liabilities?</p>
                <p className="font-medium">{opportunity.ato_liabilities || 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">Do you have any credit file issues e.g. paid or unpaid defaults?</p>
                <p className="font-medium">{opportunity.credit_issues || 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">ICR</p>
                <p className="font-medium">{opportunity.icr && opportunity.icr !== 0 ? opportunity.icr.toFixed(2) : 'Not calculated'}</p>
              </div>
              <div>
                <p className="text-gray-600">LVR</p>
                <p className="font-medium">{opportunity.lvr && opportunity.lvr !== 0 ? `${opportunity.lvr.toFixed(2)}%` : 'Not calculated'}</p>
              </div>
              {opportunity.additional_notes && (
                <div className="col-span-2">
                  <p className="text-gray-600">Additional Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{opportunity.additional_notes}</p>
                </div>
              )}
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.
              </p>
            </div>
          </div>

          {/* Opportunity Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Opportunity Notes</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-gray-300 pl-4">
                <p className="text-sm font-semibold">Abhishek Jn</p>
                <p className="text-xs text-gray-500">Tuesday, June 17, 2025</p>
                <div className="mt-2 text-sm space-y-1">
                  <p>ICR: 70.509</p>
                  <p>LVR: 837.431</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <Button
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={handleDeleteOpportunity}
            >
              Delete Opportunity
            </Button>
          </div>
          </>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Conditional rendering: Show only Reason for unqualified opportunities */}
          {opportunity.is_unqualified === 1 ? (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3 text-orange-600">Unqualified Opportunity</h3>
              <p className="text-orange-700 whitespace-pre-wrap">{opportunity.unqualified_reason || 'No reason provided'}</p>
            </div>
          ) : (
            <>
              {/* Key Dates */}
              <div className="bg-white rounded-lg border border-[#E7EBEF] p-6 space-y-4">
                {/* Date Created */}
                <div>
                  <p className="text-sm text-[#00D37F] mb-1">Date Created</p>
                  <p className="font-semibold text-[#02383B]">{format(new Date(opportunity.created_at), 'd MMM yyyy')}</p>
                </div>

                {/* Target Settlement */}
                <div>
                  <p className="text-sm text-[#00D37F] mb-1">Target Settlement</p>
                  {targetDate ? (
                    <div className="flex items-center gap-2">
                      <p
                        className="font-semibold text-[#02383B] cursor-pointer hover:underline"
                        onClick={() => setTargetDateOpen(true)}
                      >
                        {format(targetDate, 'd MMM yyyy')}
                      </p>
                      <button
                        onClick={() => setClearTargetDateOpen(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#787274]">A target settlement date has not yet been set.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setTargetDateOpen(true)}
                        className="p-0 h-auto text-[#00D37F]"
                      >
                        Set Date
                      </Button>
                    </>
                  )}
                </div>

                {/* Date Settled */}
                <div>
                  <p className="text-sm text-[#00D37F] mb-1">Date Settled</p>
                  {settledDate ? (
                    <div className="flex items-center gap-2">
                      <p
                        className="font-semibold text-[#02383B] cursor-pointer hover:underline"
                        onClick={() => setSettledDateOpen(true)}
                      >
                        {format(settledDate, 'd MMM yyyy')}
                      </p>
                      <button
                        onClick={() => setClearSettledDateOpen(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#787274]">A date settled date has not yet been set.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSettledDateOpen(true)}
                        className="p-0 h-auto text-[#00D37F]"
                      >
                        Set Date
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Deal Finalisation Information */}
              {(opportunity.loan_acc_ref_no || opportunity.flex_id || opportunity.payment_received_date || opportunity.payment_amount) ? (
                <div className="bg-white rounded-lg border border-[#E7EBEF] p-6">
                  <h3 className="text-sm font-medium text-[#00D37F] mb-3">Deal Finalisation</h3>
                  <div className="space-y-3">
                    {opportunity.loan_acc_ref_no && (
                      <div className="flex justify-between">
                        <p className="text-sm text-[#787274]">Loan Acc Ref Number</p>
                        <p className="font-medium text-[#02383B] text-right">{opportunity.loan_acc_ref_no}</p>
                      </div>
                    )}
                    {opportunity.flex_id && (
                      <div className="flex justify-between">
                        <p className="text-sm text-[#787274]">Flex ID</p>
                        <p className="font-medium text-[#02383B] text-right">{opportunity.flex_id}</p>
                      </div>
                    )}
                    {opportunity.payment_received_date && (
                      <div className="flex justify-between">
                        <p className="text-sm text-[#787274]">Payment Received</p>
                        <p className="font-medium text-[#02383B] text-right">{format(new Date(opportunity.payment_received_date), 'MMMM d, yyyy')}</p>
                      </div>
                    )}
                    {opportunity.payment_amount !== undefined && opportunity.payment_amount > 0 && (
                      <div className="flex justify-between">
                        <p className="text-sm text-[#787274]">Payment Amount</p>
                        <p className="font-medium text-[#02383B] text-right">{formatCurrency(opportunity.payment_amount)}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDealFinalisationOpen(true)}
                    className="text-[#00D37F] hover:text-[#00b86d] text-sm font-medium underline mt-4"
                  >
                    Edit Deal Finalisation
                  </button>
                </div>
              ) : settledDate && (
                <div className="bg-white rounded-lg border border-[#E7EBEF] p-6">
                  <button
                    onClick={() => setDealFinalisationOpen(true)}
                    className="text-[#00D37F] hover:text-[#00b86d] text-sm font-medium underline"
                  >
                    Add Deal Finalisation Info
                  </button>
                </div>
              )}

              {/* Application Progress */}
              <div className="bg-gradient-to-br from-[#EDFFD7] to-[#f0fff4] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2 text-[#02383B]">Application Progress</h3>
                <div className="mb-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-[#00D37F] rounded-full h-2 transition-all duration-300" style={{ width: `${getProgressPercentage(opportunity.status)}%` }}></div>
                  </div>
                  <p className="text-sm mt-1 text-[#00D37F]">{getProgressPercentage(opportunity.status)} % completed</p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {isStatusCompleted('opportunity', opportunity.status) ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D37F] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${isStatusCompleted('opportunity', opportunity.status) ? 'text-[#02383B]' : 'text-gray-500'}`}>Opportunity</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStatusClick('application_created')}
                    className="flex items-start gap-3 w-full text-left hover:bg-[#00D37F]/10 rounded p-1 -m-1 transition-colors"
                  >
                    {isStatusCompleted('application_created', opportunity.status) ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D37F] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${isStatusCompleted('application_created', opportunity.status) ? 'text-[#02383B]' : 'text-gray-500'}`}>Application Created</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleStatusClick('application_submitted')}
                    className="flex items-start gap-3 w-full text-left hover:bg-[#00D37F]/10 rounded p-1 -m-1 transition-colors"
                  >
                    {isStatusCompleted('application_submitted', opportunity.status) ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D37F] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${isStatusCompleted('application_submitted', opportunity.status) ? 'text-[#02383B]' : 'text-gray-500'}`}>Application Submitted</p>
                    </div>
                  </button>

                  <div className="flex items-start gap-3">
                    {(isStatusCompleted('conditionally_approved', opportunity.status) || isStatusCompleted('approved', opportunity.status) || isStatusCompleted('declined', opportunity.status)) ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D37F] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium mb-2 ${(isStatusCompleted('conditionally_approved', opportunity.status) || isStatusCompleted('approved', opportunity.status) || isStatusCompleted('declined', opportunity.status)) ? 'text-[#02383B]' : 'text-gray-500'}`}>Application Decision</p>
                      <div className="space-y-1 text-sm pl-4">
                        <button
                          onClick={() => handleStatusClick('conditionally_approved')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'conditionally_approved' ? (
                            <CheckCircle2 className="h-3 w-3 text-[#00D37F]" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'conditionally_approved' ? 'text-[#02383B]' : 'text-gray-400'}>Conditionally Approved</span>
                        </button>
                        <button
                          onClick={() => handleStatusClick('approved')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'approved' ? (
                            <CheckCircle2 className="h-3 w-3 text-[#00D37F]" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'approved' ? 'text-[#02383B]' : 'text-gray-400'}>Approved</span>
                        </button>
                        <button
                          onClick={() => handleStatusClick('declined', 'decision_declined')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'declined' ? (
                            <CheckCircle2 className="h-3 w-3 text-red-600" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'declined' ? 'text-red-800' : 'text-gray-400'}>Declined</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {(isStatusCompleted('settled', opportunity.status) || isStatusCompleted('completed_declined', opportunity.status) || isStatusCompleted('withdrawn', opportunity.status)) ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D37F] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium mb-2 ${(isStatusCompleted('settled', opportunity.status) || isStatusCompleted('completed_declined', opportunity.status) || isStatusCompleted('withdrawn', opportunity.status)) ? 'text-[#02383B]' : 'text-gray-500'}`}>Application Completed</p>
                      <div className="space-y-1 text-sm pl-4">
                        <button
                          onClick={() => handleStatusClick('settled')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'settled' ? (
                            <CheckCircle2 className="h-3 w-3 text-[#00D37F]" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'settled' ? 'text-[#02383B]' : 'text-gray-400'}>Settled</span>
                        </button>
                        <button
                          onClick={() => handleStatusClick('declined', 'completed_declined')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'declined' ? (
                            <CheckCircle2 className="h-3 w-3 text-red-600" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'declined' ? 'text-red-800' : 'text-gray-400'}>Declined</span>
                        </button>
                        <button
                          onClick={() => handleStatusClick('declined', 'withdrawn')}
                          className="flex items-center gap-2 hover:bg-[#00D37F]/10 rounded p-1 -ml-1 w-full text-left transition-colors"
                        >
                          {opportunity.status?.toLowerCase() === 'withdrawn' ? (
                            <CheckCircle2 className="h-3 w-3 text-gray-600" />
                          ) : (
                            <Circle className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={opportunity.status?.toLowerCase() === 'withdrawn' ? 'text-gray-800' : 'text-gray-400'}>Withdrawn</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}

      {/* Clear Target Settlement Date Confirmation Dialog */}
      <Dialog open={clearTargetDateOpen} onOpenChange={setClearTargetDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Target Settlement Date</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear the target settlement date? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearTargetDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClearTargetDate} variant="destructive">
              Clear Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Date Settled Confirmation Dialog */}
      <Dialog open={clearSettledDateOpen} onOpenChange={setClearSettledDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Date Settled</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear the date settled? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearSettledDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClearSettledDate} variant="destructive">
              Clear Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* External Ref Dialog */}
      <Dialog open={externalRefOpen} onOpenChange={setExternalRefOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Reference</DialogTitle>
            <DialogDescription>
              Enter an external reference number for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="external-ref">External Reference #</Label>
              <Input
                id="external-ref"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="Enter reference number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalRefOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveExternalRef} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Referrer Details Dialog */}
      <Dialog open={editReferrerDetailsOpen} onOpenChange={setEditReferrerDetailsOpen}>
        <DialogContent className="bg-gradient-to-br from-green-50 to-green-100">
          <DialogHeader>
            <DialogTitle className="text-green-800">Edit Referrer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="referrer-user">Select Referrer User</Label>
              <Select value={selectedReferrerUser} onValueChange={setSelectedReferrerUser}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="select" />
                </SelectTrigger>
                <SelectContent>
                  {referrerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReferrerDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateReferrerUser} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Settlement Date Dialog */}
      <Dialog open={targetDateOpen} onOpenChange={setTargetDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Target Settlement Date</DialogTitle>
            <DialogDescription>
              Choose the target settlement date for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <CalendarComponent
              mode="single"
              selected={targetDate}
              onSelect={setTargetDate}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTargetDate} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Settled Dialog */}
      <Dialog open={settledDateOpen} onOpenChange={setSettledDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Date Settled</DialogTitle>
            <DialogDescription>
              Choose the date when this opportunity was settled
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <CalendarComponent
              mode="single"
              selected={settledDate}
              onSelect={setSettledDate}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettledDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettledDate} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Finalisation Dialog */}
      <Dialog open={dealFinalisationOpen} onOpenChange={setDealFinalisationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-teal-800">Deal Finalisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-600">Loan Acc Ref Number</Label>
              <Input
                value={loanAccRefNo}
                onChange={(e) => setLoanAccRefNo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-600">Flex ID</Label>
              <Input
                value={flexId}
                onChange={(e) => setFlexId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-600">Payment Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !paymentReceivedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {paymentReceivedDate ? format(paymentReceivedDate, 'MMMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={paymentReceivedDate}
                    onSelect={setPaymentReceivedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-gray-600">Payment Amount</Label>
              <Input
                type="number"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="mt-1"
                placeholder="$0.00"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="ghost" onClick={() => setDealFinalisationOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDealFinalisation} className="text-teal-700">
                Save & Return
              </Button>
              <Button onClick={handleFinaliseAndComplete} className="bg-teal-700 hover:bg-teal-800">
                Finalise & Complete
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details Edit Dialog */}
      <Dialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
            <DialogDescription>
              Update the client information for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Borrowing Entity Type</Label>
                <Select key={clientEntityType} value={clientEntityType} onValueChange={setClientEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_company">Private Company</SelectItem>
                    <SelectItem value="public_company">Public Company</SelectItem>
                    <SelectItem value="sole_trader">Sole Trader</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Borrowing Entity Name</Label>
                <Input value={clientEntityName} onChange={(e) => setClientEntityName(e.target.value)} />
              </div>
              <div>
                <Label>Borrower Contact</Label>
                <Input value={clientContactName} onChange={(e) => setClientContactName(e.target.value)} />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input value={clientMobile} onChange={(e) => setClientMobile(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
              </div>
              <div>
                <Label>ABN</Label>
                <Input value={clientAbn} onChange={(e) => setClientAbn(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Company Address</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              </div>
              <div>
                <Label>Time in Business</Label>
                <Input value={clientTimeInBusiness} onChange={(e) => setClientTimeInBusiness(e.target.value)} />
              </div>
              <div>
                <Label>Industry</Label>
                <Select key={clientIndustry} value={clientIndustry} onValueChange={setClientIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
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
              <div className="col-span-2">
                <Label>Brief Overview</Label>
                <Textarea value={clientBriefOverview} onChange={(e) => setClientBriefOverview(e.target.value)} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClientDetails} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Details Edit Dialog */}
      <Dialog open={loanDetailsOpen} onOpenChange={setLoanDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Loan Details</DialogTitle>
            <DialogDescription>
              Update the loan information for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type of Asset</Label>
                <Select key={loanAssetType} value={loanAssetType} onValueChange={setLoanAssetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial_property">Commercial Property</SelectItem>
                    <SelectItem value="residential_property">Residential Property</SelectItem>
                    <SelectItem value="vacant_land">Vacant Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Asset Address</Label>
                <AddressAutocomplete
                  value={loanAssetAddress}
                  onChange={(value: string, addressData?: AddressData) => {
                    if (addressData) {
                      setLoanAssetAddress(addressData.fullAddress);
                    } else {
                      setLoanAssetAddress(value);
                    }
                  }}
                  placeholder="Start typing address or enter manually"
                />
              </div>
              <div>
                <Label>Loan Amount</Label>
                <Input value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} type="number" />
              </div>
              <div>
                <Label>Estimated Property Value</Label>
                <Input value={loanPropertyValue} onChange={(e) => setLoanPropertyValue(Number(e.target.value))} type="number" />
              </div>
              <div>
                <Label>Loan Type</Label>
                <Select key={loanType} value={loanType} onValueChange={setLoanType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="lease_doc">Lease Doc</SelectItem>
                    <SelectItem value="low_doc">Low Doc</SelectItem>
                    <SelectItem value="private_short_term">Private/Short Term</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loan Purpose</Label>
                <Select key={loanPurpose} value={loanPurpose} onValueChange={setLoanPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_owner_occupier">Purchase - Owner Occupier</SelectItem>
                    <SelectItem value="purchase_investment">Purchase - Investment</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                    <SelectItem value="equity_release">Equity Release</SelectItem>
                    <SelectItem value="land_bank">Land Bank</SelectItem>
                    <SelectItem value="business_use">Business Use</SelectItem>
                    <SelectItem value="commercial_equipment">Commercial Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lender</Label>
                <Input value={lender} onChange={(e) => setLender(e.target.value)} />
              </div>
            </div>

            {/* Calculated Fields */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label>LVR (Auto-calculated)</Label>
                <Input value={lvr.toFixed(2)} readOnly className="bg-gray-50 mt-1" />
                <p className="text-xs text-gray-500 mt-1">(Loan Amount / Property Value) × 100</p>
              </div>
              <div>
                <Label>ICR (Auto-calculated)</Label>
                <Input value={icr.toFixed(2)} readOnly className="bg-gray-50 mt-1" />
                <p className="text-xs text-gray-500 mt-1">Based on financial details</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLoanDetails} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Details Edit Dialog */}
      <Dialog open={financialDetailsOpen} onOpenChange={setFinancialDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Financial Details</DialogTitle>
            <DialogDescription>
              Update the financial information for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Funding Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Funding</h3>
              <div className="space-y-2">
                <Label>Will the property be funded solely from rental income?</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rentalIncome"
                      value="yes"
                      checked={rentalIncomeFunding === 'yes'}
                      onChange={(e) => setRentalIncomeFunding(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rentalIncome"
                      value="no"
                      checked={rentalIncomeFunding === 'no'}
                      onChange={(e) => setRentalIncomeFunding(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

              {rentalIncomeFunding === 'no' && (
                <div className="mt-4">
                  <Label>Net Profit Before Tax</Label>
                  <Input
                    value={netProfit ?? ''}
                    onChange={(e) => setNetProfit(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    placeholder="$4"
                    className="mt-1"
                  />
                </div>
              )}

              {rentalIncomeFunding === 'yes' && (
                <div className="mt-4">
                  <Label>Proposed Rental Income (Annual)</Label>
                  <Input
                    value={proposedRentalIncome ?? ''}
                    onChange={(e) => setProposedRentalIncome(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    placeholder="$4,564"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Addbacks Section - Only show if rental income funding is NO */}
            {rentalIncomeFunding === 'no' && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Addbacks</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amortisation</Label>
                    <Input
                      value={amortisation ?? ''}
                      onChange={(e) => setAmortisation(e.target.value === '' ? undefined : Number(e.target.value))}
                      type="number"
                      placeholder="$54,654"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Depreciation</Label>
                    <Input
                      value={depreciation ?? ''}
                      onChange={(e) => setDepreciation(e.target.value === '' ? undefined : Number(e.target.value))}
                      type="number"
                      placeholder="$65"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Existing Interest Costs</Label>
                    <Input
                      value={existingInterest ?? ''}
                      onChange={(e) => setExistingInterest(e.target.value === '' ? undefined : Number(e.target.value))}
                      type="number"
                      placeholder="$465"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Rental Expense</Label>
                    <Input
                      value={rentalExpense ?? ''}
                      onChange={(e) => setRentalExpense(e.target.value === '' ? undefined : Number(e.target.value))}
                      type="number"
                      placeholder="$465"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Proposed Rental Income (Annual)</Label>
                  <Input
                    value={proposedRentalIncome ?? ''}
                    onChange={(e) => setProposedRentalIncome(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    placeholder="$4,564"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Other Questions Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Other Questions</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Does your business and /or the borrowing entity have any existing liabilities?</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="existingLiabilities"
                        value="yes"
                        checked={existingLiabilities === 'yes'}
                        onChange={(e) => setExistingLiabilities(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="existingLiabilities"
                        value="no"
                        checked={existingLiabilities === 'no'}
                        onChange={(e) => setExistingLiabilities(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Are you looking to offer up additional property security to support your equity position?</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="additionalSecurity"
                        value="yes"
                        checked={additionalSecurity === 'yes'}
                        onChange={(e) => setAdditionalSecurity(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="additionalSecurity"
                        value="no"
                        checked={additionalSecurity === 'no'}
                        onChange={(e) => setAdditionalSecurity(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Is the application an SMSF structure?</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="smsfStructure"
                        value="yes"
                        checked={smsfStructure === 'yes'}
                        onChange={(e) => setSmsfStructure(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="smsfStructure"
                        value="no"
                        checked={smsfStructure === 'no'}
                        onChange={(e) => setSmsfStructure(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Do you have any existing or overdue ATO / tax liabilities?</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="atoLiabilities"
                        value="yes"
                        checked={atoLiabilities === 'yes'}
                        onChange={(e) => setAtoLiabilities(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="atoLiabilities"
                        value="no"
                        checked={atoLiabilities === 'no'}
                        onChange={(e) => setAtoLiabilities(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Do you have any credit file issues e.g. paid or unpaid defaults?</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="creditIssues"
                        value="yes"
                        checked={creditIssues === 'yes'}
                        onChange={(e) => setCreditIssues(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="creditIssues"
                        value="no"
                        checked={creditIssues === 'no'}
                        onChange={(e) => setCreditIssues(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Fields */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label>ICR (Auto-calculated)</Label>
                <Input value={icr.toFixed(2)} readOnly className="bg-gray-50 mt-1" type="number" step="0.01" />
                <p className="text-xs text-gray-500 mt-1">Based on financial details</p>
              </div>
              <div>
                <Label>LVR (Auto-calculated)</Label>
                <Input value={lvr.toFixed(2)} readOnly className="bg-gray-50 mt-1" type="number" step="0.01" />
                <p className="text-xs text-gray-500 mt-1">(Loan Amount / Property Value) × 100</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinancialDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFinancialDetails} className="bg-teal-600 hover:bg-teal-700">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Confirmation Dialog */}
      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent className="bg-[#F5F5DC]">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Opportunity Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-700">
              You are about to change the status of this opportunity to <strong>{formatStatusDisplay(pendingStatus)}</strong>. This will result in automated communications being sent to the referral partner and the client advising them that the opportunity has progressed.
            </p>
            <p className="text-sm text-gray-700">
              Are you sure that you want to change the status to <strong>{formatStatusDisplay(pendingStatus)}</strong>
              <br />
              Yes Proceed or No Cancel.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusConfirmOpen(false); setPendingStatus(''); }}>
              No
            </Button>
            <Button onClick={handleStatusConfirm} className="bg-teal-700 hover:bg-teal-800">
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Decision Declined Dialog */}
      <Dialog open={declinedReasonOpen} onOpenChange={setDeclinedReasonOpen}>
        <DialogContent className="bg-[#F5F5DC] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Application Decision Declined</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="declined-reason">Reason for Application Decision Declined</Label>
              <Textarea
                id="declined-reason"
                value={declinedReason}
                onChange={(e) => setDeclinedReason(e.target.value)}
                rows={6}
                className="mt-2"
                placeholder="Enter the reason for declining this application..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclinedReasonOpen(false); setDeclinedReason(''); setPendingStatus(''); }}>
              No
            </Button>
            <Button onClick={handleDeclinedReasonConfirm} className="bg-teal-700 hover:bg-teal-800">
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Completed Declined Dialog */}
      <Dialog open={completedDeclinedReasonOpen} onOpenChange={setCompletedDeclinedReasonOpen}>
        <DialogContent className="bg-[#F5F5DC] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Application Completed Declined</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="completed-declined-reason">Reason for Application Completed Declined</Label>
              <Textarea
                id="completed-declined-reason"
                value={completedDeclinedReason}
                onChange={(e) => setCompletedDeclinedReason(e.target.value)}
                rows={6}
                className="mt-2"
                placeholder="Enter the reason for declining this completed application..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompletedDeclinedReasonOpen(false); setCompletedDeclinedReason(''); setPendingStatus(''); }}>
              No
            </Button>
            <Button onClick={handleCompletedDeclinedReasonConfirm} className="bg-teal-700 hover:bg-teal-800">
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Completed Withdrawn Dialog */}
      <Dialog open={withdrawnReasonOpen} onOpenChange={setWithdrawnReasonOpen}>
        <DialogContent className="bg-[#F5F5DC] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Application Completed Withdrawn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="withdrawn-reason">Reason for Application Completed Withdrawn</Label>
              <Textarea
                id="withdrawn-reason"
                value={withdrawnReason}
                onChange={(e) => setWithdrawnReason(e.target.value)}
                rows={6}
                className="mt-2"
                placeholder="Enter the reason for withdrawing this application..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWithdrawnReasonOpen(false); setWithdrawnReason(''); setPendingStatus(''); }}>
              No
            </Button>
            <Button onClick={handleWithdrawnReasonConfirm} className="bg-teal-700 hover:bg-teal-800">
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unqualified Reason Dialog */}
      <Dialog open={unqualifiedReasonOpen} onOpenChange={setUnqualifiedReasonOpen}>
        <DialogContent className="bg-[#F5F5DC] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Reason to disqualify the opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="unqualified-reason">Reason to disqualify the opportunity</Label>
              <Textarea
                id="unqualified-reason"
                value={unqualifiedReason}
                onChange={(e) => setUnqualifiedReason(e.target.value)}
                rows={6}
                className="mt-2"
                placeholder="Enter the reason for marking this opportunity as unqualified..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnqualifiedReasonOpen(false); setUnqualifiedReason(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUnqualifiedReasonConfirm} className="bg-teal-700 hover:bg-teal-800">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
