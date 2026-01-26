'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Edit, Pencil, CheckCircle2, Circle, X } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
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

interface OpportunityDetails {
  id: string;
  opportunity_id: string;
  status: string;
  created_at: string;
  external_ref?: string;
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
  loan_asset_type?: string;
  loan_asset_address?: string;
  loan_amount?: number;
  loan_property_value?: number;
  loan_type?: string;
  loan_purpose?: string;
  lender?: string;
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
  target_settlement_date?: string;
  date_settled?: string;
  notes?: string;
  declined_reason?: string;
  completed_declined_reason?: string;
  withdrawn_reason?: string;
  loan_acc_ref_no?: string;
  flex_id?: string;
  payment_received_date?: string;
  payment_amount?: number;
  deal_finalisation_status?: string;
  referrer_group?: string;
  team_member?: string;
  organization_id?: string;
  created_by?: string;
  client_id?: string;
  is_unqualified?: number;
  unqualified_reason?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Check if coming from applications page
  const isFromApplications = searchParams.get('from') === 'applications';

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
  const [dealFinalisationOpen, setDealFinalisationOpen] = useState(false);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

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
  const [additionalNotes, setAdditionalNotes] = useState('');

  const INTEREST_RATE = 12.5;

  useEffect(() => {
    if (params.id) {
      fetchOpportunityDetails();
      fetchComments();
    }
  }, [params.id]);

  useEffect(() => {
    if (activeTab === 'history' && params.id && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab, params.id]);

  useEffect(() => {
    if (opportunity) {
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
      setAdditionalNotes(opportunity.additional_notes || '');
    }
  }, [opportunity]);

  const fetchOpportunityDetails = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`);
      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing opportunity JSON:', parseError, 'Response:', text.substring(0, 200));
        toast({
          title: 'Error',
          description: 'Failed to load details - invalid response',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

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
        setLoanAccRefNo(opp.loan_acc_ref_no || '');
        setFlexId(opp.flex_id || '');
        if (opp.payment_received_date) {
          setPaymentReceivedDate(new Date(opp.payment_received_date));
        }
        setPaymentAmount(opp.payment_amount || 0);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/comments`);
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          setComments(data.comments || []);
        }
      } catch (parseError) {
        console.error('Error parsing comments JSON:', parseError);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/history`);
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          setHistory(data.history || []);
        }
      } catch (parseError) {
        console.error('Error parsing history JSON:', parseError);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!newComment.trim()) return;
    setSavingComment(true);
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      if (response.ok) {
        setNewComment('');
        fetchComments();
        toast({ title: 'Success', description: 'Note added successfully' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add note', variant: 'destructive' });
    } finally {
      setSavingComment(false);
    }
  };

  const handleEditComment = async (id: string) => {
    if (!editCommentContent.trim()) return;
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editCommentContent }),
      });
      if (response.ok) {
        setEditCommentId(null);
        setEditCommentContent('');
        fetchComments();
        toast({ title: 'Success', description: 'Note updated' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update note', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}/comments/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchComments();
        toast({ title: 'Success', description: 'Note deleted' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'External reference updated' });
        setExternalRefOpen(false);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Target date updated' });
        setTargetDateOpen(false);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Target date cleared' });
        setTargetDate(undefined);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Settled date updated' });
        setSettledDateOpen(false);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Settled date cleared' });
        setSettledDate(undefined);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Deal finalisation saved' });
        setDealFinalisationOpen(false);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleStatusClick = (status: string, reasonType?: 'decision_declined' | 'completed_declined' | 'withdrawn') => {
    setPendingStatus(status);
    if (reasonType === 'decision_declined') {
      setDeclinedReasonOpen(true);
    } else if (reasonType === 'completed_declined') {
      setCompletedDeclinedReasonOpen(true);
    } else if (reasonType === 'withdrawn') {
      setWithdrawnReasonOpen(true);
    } else {
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
      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated' });
        setStatusConfirmOpen(false);
        setPendingStatus('');
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDeclinedReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined', declined_reason: declinedReason }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated' });
        setDeclinedReasonOpen(false);
        setDeclinedReason('');
        setPendingStatus('');
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleCompletedDeclinedReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined', completed_declined_reason: completedDeclinedReason }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated' });
        setCompletedDeclinedReasonOpen(false);
        setCompletedDeclinedReason('');
        setPendingStatus('');
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleWithdrawnReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn', withdrawn_reason: withdrawnReason }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Status updated' });
        setWithdrawnReasonOpen(false);
        setWithdrawnReason('');
        setPendingStatus('');
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleUnqualifiedReasonConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unqualified: 1, unqualified_reason: unqualifiedReason }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Marked as unqualified' });
        setUnqualifiedReasonOpen(false);
        setUnqualifiedReason('');
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Success', description: 'Opportunity deleted' });
        router.push(isFromApplications ? '/admin/applications' : '/admin/opportunities');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleOpenEditReferrerDetails = async () => {
    if (!opportunity?.organization_id) return;
    try {
      const response = await fetch(`/api/admin/referrers/${opportunity.organization_id}/users`);
      if (response.ok) {
        const data = await response.json();
        setReferrerUsers(data.users || []);
        setSelectedReferrerUser(opportunity.created_by || '');
        setEditReferrerDetailsOpen(true);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    }
  };

  const handleUpdateReferrerUser = async () => {
    if (!selectedReferrerUser) return;
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: selectedReferrerUser }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Team member updated' });
        setEditReferrerDetailsOpen(false);
        fetchOpportunityDetails();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleSaveClientDetails = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: clientEntityType,
          abn: clientAbn,
          time_in_business: clientTimeInBusiness,
          industry: clientIndustry,
          client_address: clientAddress,
          brief_overview: clientBriefOverview,
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Client details updated' });
        setClientDetailsOpen(false);
        fetchOpportunityDetails();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update client details', variant: 'destructive' });
    }
  };

  const handleSaveLoanDetails = async () => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: loanAssetType,
          asset_address: loanAssetAddress,
          loan_amount: loanAmount,
          property_value: loanPropertyValue,
          loan_type: loanType,
          loan_purpose: loanPurpose,
          lender: lender,
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Loan details updated' });
        setLoanDetailsOpen(false);
        fetchOpportunityDetails();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update loan details', variant: 'destructive' });
    }
  };

  const handleSaveFinancialDetails = async () => {
    // Calculate ICR and LVR
    const totalIncome = (netProfit || 0) + (amortisation || 0) + (depreciation || 0) + (existingInterest || 0) + (rentalExpense || 0) + (proposedRentalIncome || 0);
    const proposedInterest = (loanAmount * INTEREST_RATE) / 100;
    const totalInterest = (existingInterest || 0) + proposedInterest;
    const calculatedIcr = totalInterest > 0 ? totalIncome / totalInterest : 0;
    const calculatedLvr = loanPropertyValue > 0 ? (loanAmount / loanPropertyValue) * 100 : 0;

    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_income: rentalIncomeFunding,
          net_profit: netProfit || 0,
          ammortisation: amortisation || 0,
          deprecition: depreciation || 0,
          existing_interest_costs: existingInterest || 0,
          rental_expense: rentalExpense || 0,
          proposed_rental_income: proposedRentalIncome || 0,
          existing_liabilities: existingLiabilities,
          additional_property: additionalSecurity,
          smsf_structure: smsfStructure,
          ato_liabilities: atoLiabilities,
          credit_file_issues: creditIssues,
          icr: calculatedIcr,
          lvr: calculatedLvr,
          additional_notes: additionalNotes,
        }),
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Financial details updated' });
        setFinancialDetailsOpen(false);
        fetchOpportunityDetails();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update financial details', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd MMM yyyy');
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatEntityType = (type: string) => {
    const types: { [key: string]: string } = {
      'private_company': 'Private Company',
      'public_company': 'Public Company',
      'sole_trader': 'Sole Trader',
      'partnership': 'Partnership',
      'trust': 'Trust',
      'smsf_trust': 'SMSF Trust',
      'individual': 'Individual',
    };
    return types[type] || type || '-';
  };

  const formatAssetType = (type: string) => {
    const types: { [key: string]: string } = {
      'commercial_property': 'Commercial Property',
      'residential_property': 'Residential Property',
      'vacant_land': 'Vacant Land',
    };
    return types[type] || type || '-';
  };

  const formatLoanType = (type: string) => {
    const types: { [key: string]: string } = {
      'construction': 'Construction',
      'lease_doc': 'Lease Doc',
      'low_doc': 'Low Doc',
      'private_short_term': 'Private Short Term',
      'unsure': 'Unsure',
    };
    return types[type] || type || '-';
  };

  const formatLoanPurpose = (purpose: string) => {
    const purposes: { [key: string]: string } = {
      'purchase': 'Purchase',
      'refinance': 'Refinance',
      'equity_release': 'Equity Release',
      'construction': 'Construction',
      'renovation': 'Renovation',
      'commercial_equipment': 'Commercial Equipment',
    };
    return purposes[purpose] || purpose || '-';
  };

  const formatYesNo = (value: string | undefined) => {
    if (!value) return '-';
    return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
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
    };
    return statusOrder[status?.toLowerCase()] || 20;
  };

  const isStatusCompleted = (checkStatus: string, currentStatus: string) => {
    const statusOrder = ['opportunity', 'application_created', 'application_submitted', 'conditionally_approved', 'approved', 'declined', 'settled'];
    const checkIndex = statusOrder.indexOf(checkStatus);
    const currentIndex = statusOrder.indexOf(currentStatus?.toLowerCase());
    return currentIndex >= checkIndex && checkIndex !== -1;
  };

  const isApplicationStatus = (status: string) => {
    return ['application_created', 'application_submitted', 'conditionally_approved', 'approved', 'declined', 'settled', 'withdrawn'].includes(status?.toLowerCase());
  };

  // Determine loading text based on context
  const loadingText = isFromApplications ? 'Loading application details...' : 'Loading opportunity details...';

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Not found</p>
      </div>
    );
  }

  const backUrl = isFromApplications
    ? '/admin/applications'
    : (opportunity.is_unqualified == 1 ? '/admin/opportunities/unqualified' : '/admin/opportunities');

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)} className="text-gray-600 hover:text-gray-900 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-[#02383B]">{opportunity.opportunity_id}</span>
            {' '}
            <span className="text-[#00D37F]">{opportunity.client_entity_name || ''}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/admin/opportunities/${params.id}/export/csv`, '_blank')}
            className="text-[#00D37F] border-[#00D37F] hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/admin/opportunities/${params.id}/export/pdf`, '_blank')}
            className="text-[#00D37F] border-[#00D37F] hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          {opportunity.is_unqualified !== 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnqualifiedReasonOpen(true)}
              className="text-[#00D37F] border-[#00D37F] hover:bg-green-50"
            >
              <X className="h-4 w-4 mr-1" />
              Unqualified
            </Button>
          )}
        </div>
      </div>

      {/* Referrer Info Row */}
      <div className="mb-6 text-sm text-gray-600">
        <span className="font-medium">Referrer Group:</span>{' '}
        <span className="text-[#00D37F] underline cursor-pointer">{opportunity.referrer_group || '-'}</span>
        <span className="mx-4">|</span>
        <span className="font-medium">Team Member:</span>{' '}
        <button onClick={handleOpenEditReferrerDetails} className="text-[#00D37F] underline">
          {opportunity.team_member || '-'}
        </button>
        <span className="mx-4">|</span>
        <span className="font-medium">External Ref:</span>{' '}
        {opportunity.external_ref ? (
          <button onClick={() => setExternalRefOpen(true)} className="text-[#00D37F] underline">
            {opportunity.external_ref}
          </button>
        ) : (
          <button onClick={() => setExternalRefOpen(true)} className="text-[#00D37F] underline">
            Add
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-3 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'overview' ? 'border-[#02383B] text-[#02383B]' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'pb-3 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'history' ? 'border-[#02383B] text-[#02383B]' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          History
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Client Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#02383B]">Client Details</h2>
                <button
                  onClick={() => setClientDetailsOpen(true)}
                  className="text-gray-400 hover:text-[#02383B] transition-colors"
                  title="Edit Client Details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <DetailRow label="Borrowing Entity Type" value={formatEntityType(opportunity.client_entity_type || '')} />
                <DetailRow label="Borrowing Entity Name" value={opportunity.client_entity_name || '-'} />
                <DetailRow label="Borrower Contact" value={opportunity.client_contact_name || '-'} />
                <DetailRow label="Mobile" value={opportunity.client_mobile || '-'} />
                <DetailRow label="Email" value={opportunity.client_email || '-'} isLink />
                <DetailRow label="Company Address" value={opportunity.client_address || '-'} />
                <DetailRow label="ABN" value={opportunity.client_abn || '-'} />
                <DetailRow label="Time in business" value={opportunity.client_time_in_business || '-'} />
                <DetailRow label="Industry" value={opportunity.client_industry || '-'} />
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Brief Overview</p>
                  <p className="text-sm text-[#00D37F]">{opportunity.client_brief_overview || '-'}</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Loan Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#02383B]">Loan Details</h2>
                <button
                  onClick={() => setLoanDetailsOpen(true)}
                  className="text-gray-400 hover:text-[#02383B] transition-colors"
                  title="Edit Loan Details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <DetailRow label="Type of Asset" value={formatAssetType(opportunity.loan_asset_type || '')} />
                <DetailRow label="Asset Address" value={opportunity.loan_asset_address || '-'} />
                <DetailRow label="Loan Amount" value={formatCurrency(opportunity.loan_amount)} />
                <DetailRow label="Estimated Property Value" value={formatCurrency(opportunity.loan_property_value)} />
                <DetailRow label="Loan Type" value={formatLoanType(opportunity.loan_type || '')} />
                <DetailRow label="Loan Purpose" value={formatLoanPurpose(opportunity.loan_purpose || '')} />
                <DetailRow label="Lender" value={opportunity.lender || '-'} />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Financial Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#02383B]">Financial Details</h2>
                <button
                  onClick={() => setFinancialDetailsOpen(true)}
                  className="text-gray-400 hover:text-[#02383B] transition-colors"
                  title="Edit Financial Details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <DetailRow label="Will the property be funded solely from rental income?" value={formatYesNo(opportunity.rental_income)} />
                <DetailRow label="Net Profit Before Tax" value={formatCurrency(opportunity.net_profit)} />
                <DetailRow label="Amortisation" value={formatCurrency(opportunity.amortisation)} />
                <DetailRow label="Depreciation" value={formatCurrency(opportunity.depreciation)} />
                <DetailRow label="Existing Interest Costs" value={formatCurrency(opportunity.existing_interest)} />
                <DetailRow label="Rental Expense" value={formatCurrency(opportunity.rental_expense)} />
                <DetailRow label="Proposed Rental Income (Annual)" value={formatCurrency(opportunity.proposed_rental_income)} />
                <DetailRow label="Does your business and /or the borrowing entity have any existing liabilities?" value={formatYesNo(opportunity.existing_liabilities)} />
                <DetailRow label="Are you looking to offer up additional property security to support your equity position?" value={formatYesNo(opportunity.additional_security)} />
                <DetailRow label="Is the application an SMSF structure?" value={formatYesNo(opportunity.smsf_structure)} />
                <DetailRow label="Do you have any existing or overdue ATO / tax liabilities?" value={formatYesNo(opportunity.ato_liabilities)} />
                <DetailRow label="Do you have any credit file issues e.g. paid or unpaid defaults?" value={formatYesNo(opportunity.credit_issues)} />
                <DetailRow label="ICR" value={opportunity.icr ? opportunity.icr.toFixed(2) : '-'} />
                <DetailRow label="LVR" value={opportunity.lvr ? `${opportunity.lvr.toFixed(2)}%` : '-'} />
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Additional Notes</p>
                  <p className="text-sm">{opportunity.additional_notes || '-'}</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Opportunity Notes */}
            <div className="bg-[#EDFFD7] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[#02383B]">Opportunity Notes</h2>
              <p className="text-sm text-[#787274] mt-1 mb-4">Please add any notes you feel relevant for the Loanease team regarding this Opportunity</p>

              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder=""
                className="mb-3 bg-white border-0 rounded-lg"
                rows={4}
              />
              <Button
                onClick={handleSaveComment}
                disabled={savingComment || !newComment.trim()}
                className="bg-[#00D37F] hover:bg-[#00b86e] text-white mb-6"
              >
                Save
              </Button>

              {/* Existing Notes */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="pb-4 border-b border-[#00D37F]/20 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-[#02383B]">{comment.user_name}</p>
                        <p className="text-sm text-[#787274]">{formatDate(comment.created_at)}</p>
                        {editCommentId === comment.id ? (
                          <div className="mt-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              rows={2}
                              className="mb-2 bg-white"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditComment(comment.id)} className="bg-[#00D37F] hover:bg-[#00b86e]">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditCommentId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-[#00D37F] mt-1">{comment.content}</p>
                        )}
                      </div>
                      {editCommentId !== comment.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditCommentId(comment.id);
                              setEditCommentContent(comment.content);
                            }}
                            className="text-gray-400 hover:text-[#02383B] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Button */}
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={handleDeleteOpportunity}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Delete Opportunity
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Dates Card - Dark teal background */}
            <div style={{ backgroundColor: '#02383B' }} className="rounded-lg p-6 text-white">
              <div className="space-y-4">
                <div>
                  <p className="text-[#00D37F] text-sm mb-1">Date Created</p>
                  <p className="font-semibold text-white">{formatDate(opportunity.created_at)}</p>
                </div>
                <div>
                  <p className="text-[#00D37F] text-sm mb-1">Target Settlement</p>
                  {targetDate ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTargetDateOpen(true)} className="font-semibold text-white hover:underline">
                        {formatDate(targetDate.toISOString())}
                      </button>
                      <button onClick={handleClearTargetDate} className="text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-300 text-sm">A target settlement date has not yet been set.</p>
                  )}
                </div>
                <div>
                  <p className="text-[#00D37F] text-sm mb-1">Date Settled</p>
                  {settledDate ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSettledDateOpen(true)} className="font-semibold text-white hover:underline">
                        {formatDate(settledDate.toISOString())}
                      </button>
                      <button onClick={handleClearSettledDate} className="text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-300 text-sm">A date settled date has not yet been set</p>
                  )}
                </div>
                <div className="pt-4 border-t border-white/20">
                  <p className="text-gray-400 text-sm mb-1">Deal Finalisation Information</p>
                  <p className="text-gray-300 text-sm">
                    {opportunity.deal_finalisation_status ? `Status: ${opportunity.deal_finalisation_status}` : 'No deal finalisation info yet'}
                  </p>
                </div>
                <button
                  onClick={() => setDealFinalisationOpen(true)}
                  className="flex items-center gap-1 text-white text-sm hover:text-[#00D37F]"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>

            {/* Application Progress */}
            <div style={{ backgroundColor: 'rgb(237, 255, 215)' }} className="rounded-lg p-6">
              <h3 className="font-semibold text-[#02383B] mb-4">Application Progress</h3>
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#00D37F] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(opportunity.status)}%` }}
                  />
                </div>
              </div>
              <p className="text-[#00D37F] text-sm mb-4">{getProgressPercentage(opportunity.status)} % completed</p>

              <div className="space-y-3">
                <ProgressItem
                  label="Opportunity"
                  completed={isStatusCompleted('opportunity', opportunity.status)}
                  active={opportunity.status === 'opportunity'}
                  onClick={() => handleStatusClick('opportunity')}
                />
                <ProgressItem
                  label="Application Created"
                  completed={isStatusCompleted('application_created', opportunity.status)}
                  active={opportunity.status === 'application_created'}
                  onClick={() => handleStatusClick('application_created')}
                />
                <ProgressItem
                  label="Application Submitted"
                  completed={isStatusCompleted('application_submitted', opportunity.status)}
                  active={opportunity.status === 'application_submitted'}
                  onClick={() => handleStatusClick('application_submitted')}
                />
                <div>
                  <ProgressItem
                    label="Application Decision"
                    completed={isStatusCompleted('conditionally_approved', opportunity.status) || isStatusCompleted('approved', opportunity.status) || opportunity.status === 'declined'}
                    active={['conditionally_approved', 'approved', 'declined'].includes(opportunity.status)}
                    onClick={() => {}}
                  />
                  <div className="ml-6 mt-1 space-y-1 text-sm text-gray-400">
                    <button onClick={() => handleStatusClick('conditionally_approved')} className={cn(opportunity.status === 'conditionally_approved' && 'text-[#00D37F] font-medium')}>
                      Conditionally Approved
                    </button>
                    <br />
                    <button onClick={() => handleStatusClick('approved')} className={cn(opportunity.status === 'approved' && 'text-[#00D37F] font-medium')}>
                      Approved
                    </button>
                    <br />
                    <button onClick={() => handleStatusClick('declined', 'decision_declined')} className={cn(opportunity.status === 'declined' && 'text-[#00D37F] font-medium')}>
                      Declined
                    </button>
                  </div>
                </div>
                <div>
                  <ProgressItem
                    label="Application Completed"
                    completed={opportunity.status === 'settled' || opportunity.status === 'withdrawn'}
                    active={['settled', 'withdrawn'].includes(opportunity.status)}
                    onClick={() => {}}
                  />
                  <div className="ml-6 mt-1 space-y-1 text-sm text-gray-400">
                    <button onClick={() => handleStatusClick('settled')} className={cn(opportunity.status === 'settled' && 'text-[#00D37F] font-medium')}>
                      Settled
                    </button>
                    <br />
                    <button onClick={() => handleStatusClick('completed_declined', 'completed_declined')} className={cn(opportunity.status === 'completed_declined' && 'text-[#00D37F] font-medium')}>
                      Declined
                    </button>
                    <br />
                    <button onClick={() => handleStatusClick('withdrawn', 'withdrawn')} className={cn(opportunity.status === 'withdrawn' && 'text-[#00D37F] font-medium')}>
                      Withdrawn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {historyLoading ? (
            <p className="text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500">No history available</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="border-b border-gray-100 pb-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-[#02383B]">{entry.description}</p>
                      <p className="text-sm text-gray-500">{entry.user_name}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <p>{entry.date}</p>
                      <p>{entry.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={targetDateOpen} onOpenChange={setTargetDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Target Settlement Date</DialogTitle>
          </DialogHeader>
          <CalendarComponent
            mode="single"
            selected={targetDate}
            onSelect={setTargetDate}
            className="rounded-md border"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTargetDate} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settledDateOpen} onOpenChange={setSettledDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Date Settled</DialogTitle>
          </DialogHeader>
          <CalendarComponent
            mode="single"
            selected={settledDate}
            onSelect={setSettledDate}
            className="rounded-md border"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettledDateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettledDate} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={externalRefOpen} onOpenChange={setExternalRefOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit External Reference</DialogTitle>
          </DialogHeader>
          <Input
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="Enter external reference"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalRefOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExternalRef} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editReferrerDetailsOpen} onOpenChange={setEditReferrerDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <Select value={selectedReferrerUser} onValueChange={setSelectedReferrerUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {referrerUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.surname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReferrerDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateReferrerUser} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dealFinalisationOpen} onOpenChange={setDealFinalisationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deal Finalisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Loan Account Reference No</Label>
              <Input value={loanAccRefNo} onChange={(e) => setLoanAccRefNo(e.target.value)} />
            </div>
            <div>
              <Label>Flex ID</Label>
              <Input value={flexId} onChange={(e) => setFlexId(e.target.value)} />
            </div>
            <div>
              <Label>Payment Received Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    {paymentReceivedDate ? format(paymentReceivedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={paymentReceivedDate} onSelect={setPaymentReceivedDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealFinalisationOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDealFinalisation} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>Are you sure you want to change the status?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusConfirm} className="bg-[#00D37F] hover:bg-[#00b86d]">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declinedReasonOpen} onOpenChange={setDeclinedReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Reason</DialogTitle>
            <DialogDescription>Please provide a reason for declining</DialogDescription>
          </DialogHeader>
          <Textarea value={declinedReason} onChange={(e) => setDeclinedReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclinedReasonOpen(false)}>Cancel</Button>
            <Button onClick={handleDeclinedReasonConfirm} className="bg-[#00D37F] hover:bg-[#00b86d]">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completedDeclinedReasonOpen} onOpenChange={setCompletedDeclinedReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Reason</DialogTitle>
            <DialogDescription>Please provide a reason for declining</DialogDescription>
          </DialogHeader>
          <Textarea value={completedDeclinedReason} onChange={(e) => setCompletedDeclinedReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletedDeclinedReasonOpen(false)}>Cancel</Button>
            <Button onClick={handleCompletedDeclinedReasonConfirm} className="bg-[#00D37F] hover:bg-[#00b86d]">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawnReasonOpen} onOpenChange={setWithdrawnReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdrawn Reason</DialogTitle>
            <DialogDescription>Please provide a reason for withdrawal</DialogDescription>
          </DialogHeader>
          <Textarea value={withdrawnReason} onChange={(e) => setWithdrawnReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawnReasonOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdrawnReasonConfirm} className="bg-[#00D37F] hover:bg-[#00b86d]">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unqualifiedReasonOpen} onOpenChange={setUnqualifiedReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Unqualified</DialogTitle>
            <DialogDescription>Please provide a reason for marking this opportunity as unqualified</DialogDescription>
          </DialogHeader>
          <Textarea value={unqualifiedReason} onChange={(e) => setUnqualifiedReason(e.target.value)} rows={3} placeholder="Enter reason..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnqualifiedReasonOpen(false)}>Cancel</Button>
            <Button onClick={handleUnqualifiedReasonConfirm} className="bg-[#00D37F] hover:bg-[#00b86d]">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details Edit Dialog */}
      <Dialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Borrowing Entity Type</Label>
                <Select value={clientEntityType} onValueChange={setClientEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
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
              <div>
                <Label>Borrowing Entity Name</Label>
                <Input value={clientEntityName} onChange={(e) => setClientEntityName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Borrower Contact</Label>
                <Input value={clientContactName} onChange={(e) => setClientContactName(e.target.value)} />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input value={clientMobile} onChange={(e) => setClientMobile(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div>
              <Label>Company Address</Label>
              <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ABN</Label>
                <Input value={clientAbn} onChange={(e) => setClientAbn(e.target.value)} />
              </div>
              <div>
                <Label>Time in Business</Label>
                <Input value={clientTimeInBusiness} onChange={(e) => setClientTimeInBusiness(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={clientIndustry} onValueChange={setClientIndustry}>
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
            <div>
              <Label>Brief Overview</Label>
              <Textarea value={clientBriefOverview} onChange={(e) => setClientBriefOverview(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveClientDetails} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Details Edit Dialog */}
      <Dialog open={loanDetailsOpen} onOpenChange={setLoanDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Loan Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type of Asset</Label>
              <Select value={loanAssetType} onValueChange={setLoanAssetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
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
              <Input value={loanAssetAddress} onChange={(e) => setLoanAssetAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loan Amount</Label>
                <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} />
              </div>
              <div>
                <Label>Estimated Property Value</Label>
                <Input type="number" value={loanPropertyValue} onChange={(e) => setLoanPropertyValue(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loan Type</Label>
                <Select value={loanType} onValueChange={setLoanType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="lease_doc">Lease Doc</SelectItem>
                    <SelectItem value="low_doc">Low Doc</SelectItem>
                    <SelectItem value="private_short_term">Private Short Term</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loan Purpose</Label>
                <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                    <SelectItem value="equity_release">Equity Release</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="commercial_equipment">Commercial Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Lender</Label>
              <Input value={lender} onChange={(e) => setLender(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLoanDetails} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Details Edit Dialog */}
      <Dialog open={financialDetailsOpen} onOpenChange={setFinancialDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Financial Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Will the property be funded solely from rental income?</Label>
              <Select value={rentalIncomeFunding} onValueChange={setRentalIncomeFunding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Net Profit Before Tax</Label>
                <Input type="number" value={netProfit || ''} onChange={(e) => setNetProfit(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Amortisation</Label>
                <Input type="number" value={amortisation || ''} onChange={(e) => setAmortisation(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Depreciation</Label>
                <Input type="number" value={depreciation || ''} onChange={(e) => setDepreciation(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Existing Interest Costs</Label>
                <Input type="number" value={existingInterest || ''} onChange={(e) => setExistingInterest(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rental Expense</Label>
                <Input type="number" value={rentalExpense || ''} onChange={(e) => setRentalExpense(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Proposed Rental Income (Annual)</Label>
                <Input type="number" value={proposedRentalIncome || ''} onChange={(e) => setProposedRentalIncome(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Does your business have any existing liabilities?</Label>
                <Select value={existingLiabilities} onValueChange={setExistingLiabilities}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Additional property security?</Label>
                <Select value={additionalSecurity} onValueChange={setAdditionalSecurity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Is this an SMSF structure?</Label>
                <Select value={smsfStructure} onValueChange={setSmsfStructure}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Any ATO / tax liabilities?</Label>
                <Select value={atoLiabilities} onValueChange={setAtoLiabilities}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Any credit file issues?</Label>
              <Select value={creditIssues} onValueChange={setCreditIssues}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinancialDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFinancialDetails} className="bg-[#00D37F] hover:bg-[#00b86d]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function DetailRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={cn('text-sm text-right', isLink ? 'text-[#00D37F]' : 'text-gray-900')}>
        {value}
      </span>
    </div>
  );
}

function ProgressItem({ label, completed, active, onClick }: { label: string; completed: boolean; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full text-left">
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-[#00D37F]" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300" />
      )}
      <span className={cn('text-sm', completed ? 'text-[#02383B] font-medium' : 'text-gray-400')}>
        {label}
      </span>
    </button>
  );
}
