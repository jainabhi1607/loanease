'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, DollarSign, FileText, CheckCircle2, Target, Percent, Plus, User, Mail, RotateCcw, Edit, Download, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { EditUserDialog } from '@/components/EditUserDialog';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserInvitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  resent_count: number;
  last_resent_at?: string;
}

interface OrganisationUser {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  role: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  deal_id: string;
  date_created: string;
  borrowing_entity: string;
  loan_type: string;
  referrer_name: string;
  referrer_type: string;
  loan_amount: number;
  status: string;
}

interface ReferrerStats {
  open_opportunities: number;
  opportunities_value: number;
  open_applications: number;
  settled_applications: number;
  total_settled_value: number;
  conversion_ratio: number;
}

interface Referrer {
  id: string;
  organisation_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  state: string;
  status: 'active' | 'inactive';
  created_at: string;
  user: {
    id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
    mobile: string;
    role: string;
    two_fa_enabled: boolean;
    created_at: string;
  };
  organisation: {
    id: string;
    abn: string;
    company_name: string;
    trading_name: string;
    entity_type: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    phone: string;
    industry_type: string;
    gst_registered: boolean;
    commission_structure: string;
    created_at: string;
  };
  directors: Array<{
    id: string;
    organisation_id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
    is_primary: boolean;
    created_at: string;
  }>;
}

export default function ViewReferrerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [organisationUsers, setOrganisationUsers] = useState<OrganisationUser[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [stats, setStats] = useState<ReferrerStats>({
    open_opportunities: 0,
    opportunities_value: 0,
    open_applications: 0,
    settled_applications: 0,
    total_settled_value: 0,
    conversion_ratio: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganisationUser | null>(null);
  const [commissionSplit, setCommissionSplit] = useState<string | null>(null);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!referrer?.organisation_id) return;
    
    try {
      const response = await fetch(`/api/admin/referrers/invite?organisationId=${referrer.organisation_id}`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [referrer?.organisation_id]);

  const fetchOrganisationUsers = useCallback(async () => {
    if (!referrer?.organisation_id) return;

    try {
      const response = await fetch(`/api/admin/referrers/${referrer.organisation_id}/users`);
      if (response.ok) {
        const data = await response.json();
        setOrganisationUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching organisation users:', error);
    }
  }, [referrer?.organisation_id]);

  const fetchOpportunities = useCallback(async () => {
    if (!referrer?.organisation_id) return;

    setLoadingOpportunities(true);
    try {
      const response = await fetch(`/api/admin/opportunities?organizationId=${referrer.organisation_id}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoadingOpportunities(false);
    }
  }, [referrer?.organisation_id]);

  const fetchStats = useCallback(async () => {
    if (!referrer?.id) return;

    setLoadingStats(true);
    try {
      const response = await fetch(`/api/admin/referrers/${referrer.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [referrer?.id]);

  const fetchCommissionSplit = useCallback(async () => {
    if (!referrer?.id) return;

    try {
      const response = await fetch(`/api/admin/referrers/${referrer.id}/commission-split`);
      if (response.ok) {
        const data = await response.json();
        setCommissionSplit(data.commission_split);
      }
    } catch (error) {
      console.error('Error fetching commission split:', error);
    }
  }, [referrer?.id]);

  useEffect(() => {
    const fetchReferrer = async () => {
      try {
        const response = await fetch(`/api/admin/referrers/${params.id}`);
        
        if (!response.ok) {
          console.error('Error fetching referrer');
          return;
        }
        
        const data = await response.json();
        setReferrer(data.referrer);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReferrer();
  }, [params.id]);

  useEffect(() => {
    if (referrer?.organisation_id) {
      fetchInvitations();
      fetchOrganisationUsers();
      fetchOpportunities();
    }
    if (referrer?.id) {
      fetchStats();
      fetchCommissionSplit();
    }
  }, [referrer?.organisation_id, referrer?.id, fetchInvitations, fetchOrganisationUsers, fetchOpportunities, fetchStats, fetchCommissionSplit]);

  const handleResendInvite = async (inviteId: string, email: string) => {
    setResendingInvite(inviteId);
    try {
      const response = await fetch(`/api/admin/referrers/invite/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Invitation resent to ${email}`,
        });
        fetchInvitations();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend invitation');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleSaveCommission = async () => {
    if (!referrer?.id) return;

    setSavingCommission(true);
    try {
      const response = await fetch(`/api/admin/referrers/${referrer.id}/commission-split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_split: editingCommission || null }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Commission split saved successfully',
        });
        setCommissionSplit(editingCommission || null);
        setCommissionDialogOpen(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save commission split',
        variant: 'destructive',
      });
    } finally {
      setSavingCommission(false);
    }
  };

  const handleDownloadAgreement = async () => {
    if (!referrer?.id) return;

    setDownloadingAgreement(true);
    try {
      const response = await fetch(`/api/admin/referrers/${referrer.id}/download-agreement`);
      if (!response.ok) {
        throw new Error('Failed to download agreement');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'Loanease-ReferrerAgreement.pdf';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download agreement',
        variant: 'destructive',
      });
    } finally {
      setDownloadingAgreement(false);
    }
  };

  // Helper function to format loan type
  const formatLoanType = (loanType: string) => {
    if (!loanType) return '-';
    const loanTypeMap: { [key: string]: string } = {
      'construction': 'Construction',
      'lease_doc': 'Lease Doc',
      'low_doc': 'Low Doc',
      'private_short_term': 'Private/Short Term',
      'unsure': 'Unsure'
    };
    return loanTypeMap[loanType] || loanType;
  };

  // Helper function to format status
  const formatStatus = (status: string) => {
    if (!status) return 'draft';
    const statusMap: { [key: string]: string } = {
      'draft': 'Draft',
      'opportunity': 'Opportunity',
      'application_created': 'Application Created',
      'application_submitted': 'Application Submitted',
      'conditionally_approved': 'Conditionally Approved',
      'approved': 'Approved',
      'declined': 'Declined',
      'settled': 'Settled',
      'withdrawn': 'Withdrawn'
    };
    return statusMap[status] || status;
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'draft': 'bg-gray-100 text-gray-800',
      'opportunity': 'bg-[#00D37F] text-white',
      'application_created': 'bg-blue-100 text-blue-800',
      'application_submitted': 'bg-blue-100 text-blue-800',
      'conditionally_approved': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'declined': 'bg-red-100 text-red-800',
      'settled': 'bg-purple-100 text-purple-800',
      'withdrawn': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (!sortKey) return 0;
    let aValue: any = a[sortKey as keyof Opportunity];
    let bValue: any = b[sortKey as keyof Opportunity];

    // Handle dates
    if (sortKey === 'date_created') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle numbers
    if (sortKey === 'loan_amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle strings
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue ? bValue.toLowerCase() : '';
    }

    // Handle null values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedOpportunities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOpportunities = sortedOpportunities.slice(startIndex, endIndex);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!referrer) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Referrer not found</p>
          <Button 
            onClick={() => router.push('/admin/referrers')}
            className="mt-4"
          >
            Back to Referrers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/referrers')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Referrers
        </Button>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#02383B]">{referrer.company_name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Contact: {referrer.contact_name} • {referrer.email} • {referrer.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/referrers/${params.id}/edit`)}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="opportunities" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Opportunities / Applications
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview" className="p-6">
            {/* Stats Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats.open_opportunities}
                </div>
                <p className="text-xs text-gray-600 mt-1">Open Opportunities</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="text-xs text-gray-500">Value</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : `$${stats.opportunities_value.toLocaleString()}`}
                </div>
                <p className="text-xs text-gray-600 mt-1">Opportunities Value</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats.open_applications}
                </div>
                <p className="text-xs text-gray-600 mt-1">Open Applications</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  <span className="text-xs text-gray-500">Complete</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats.settled_applications}
                </div>
                <p className="text-xs text-gray-600 mt-1">Settled Applications</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : `$${stats.total_settled_value.toLocaleString()}`}
                </div>
                <p className="text-xs text-gray-600 mt-1">Total Settled Value</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Percent className="h-5 w-5 text-pink-500" />
                  <span className="text-xs text-gray-500">Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : `${stats.conversion_ratio}%`}
                </div>
                <p className="text-xs text-gray-600 mt-1">Conversion Ratio</p>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Left Column - 66% width */}
              <div className="w-2/3 space-y-8">
                {/* Organisation Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Organisation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Name</label>
                      <p className="mt-1">{referrer.organisation?.company_name || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trading Name</label>
                      <p className="mt-1">{referrer.organisation?.trading_name || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">ABN</label>
                      <p className="mt-1">{referrer.organisation?.abn || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Entity Type</label>
                      <p className="mt-1">{referrer.organisation?.entity_type || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry Type</label>
                      <p className="mt-1">{referrer.organisation?.industry_type || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="mt-1">{referrer.organisation?.address || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1">{referrer.organisation?.phone || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Primary Contact */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Primary Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">First Name</label>
                      <p className="mt-1">{referrer.user?.first_name || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Surname</label>
                      <p className="mt-1">{referrer.user?.surname || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1">{referrer.user?.email || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1">{referrer.user?.phone || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">2FA Enabled</label>
                      <p className="mt-1">{referrer.user?.two_fa_enabled ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Directors */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Directors</h3>
                  {referrer.directors && referrer.directors.length > 0 ? (
                    <div className="space-y-4">
                      {referrer.directors.map((director) => (
                        <div key={director.id} className="border rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Name</label>
                              <p className="mt-1">{director.first_name} {director.surname}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Email</label>
                              <p className="mt-1">{director.email || ''}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Phone</label>
                              <p className="mt-1">{director.phone || ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">There are no additional directors for this organisation</p>
                  )}
                </div>
              </div>

              {/* Right Column - 34% width */}
              <div className="w-1/3 space-y-6">
                {/* Users Section */}
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Users</h3>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8"
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add User
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Show all users in the organisation */}
                        {organisationUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {user.first_name} {user.surname}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.id === referrer.user?.id ? (
                                <Badge className="bg-[#023838] text-white hover:bg-[#023838]">
                                  Account Owner
                                </Badge>
                              ) : user.role === 'referrer_admin' ? (
                                <Badge className="bg-[#00D169] text-white hover:bg-[#00D169]">
                                  Admin
                                </Badge>
                              ) : (
                                <Badge className="bg-[#7161F2] text-white hover:bg-[#7161F2]">
                                  Team Member
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-gray-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Show pending invitations */}
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {invitation.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Invited
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2"
                                  onClick={() => handleResendInvite(invitation.id, invitation.email)}
                                  disabled={resendingInvite === invitation.id}
                                >
                                  {resendingInvite === invitation.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Resend
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Referral Agreement Section */}
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">Referral Agreement</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-4">
                      Download the referrer agreement for <strong>{referrer.organisation?.company_name || referrer.company_name}</strong> here
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadAgreement}
                      disabled={downloadingAgreement}
                    >
                      {downloadingAgreement ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Agreement
                    </Button>
                  </div>
                </div>

                {/* Commission Split Section */}
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Commission Split</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        setEditingCommission(commissionSplit || '');
                        setCommissionDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {commissionSplit ? 'Edit' : 'Add Custom'}
                    </Button>
                  </div>
                  <div className="p-4">
                    {commissionSplit ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{commissionSplit}</p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        You are currently displaying the default commission split for this Referrer.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="opportunities" className="p-6">
            {loadingOpportunities ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No opportunities found for this referrer</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        label="Deal ID"
                        sortKey="deal_id"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Date Created"
                        sortKey="date_created"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Borrowing Entity"
                        sortKey="borrowing_entity"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Loan Type"
                        sortKey="loan_type"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Referrer Name"
                        sortKey="referrer_name"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Loan Amount"
                        sortKey="loan_amount"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHead
                        label="Status"
                        sortKey="status"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOpportunities.map((opportunity) => (
                      <TableRow key={opportunity.id}>
                        <TableCell className="font-medium">{opportunity.deal_id}</TableCell>
                        <TableCell>
                          {new Date(opportunity.date_created).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>{opportunity.borrowing_entity || '-'}</TableCell>
                        <TableCell>{formatLoanType(opportunity.loan_type)}</TableCell>
                        <TableCell>{opportunity.referrer_name || '-'}</TableCell>
                        <TableCell>
                          {opportunity.loan_amount ? `$${opportunity.loan_amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(opportunity.status)}>
                            {formatStatus(opportunity.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/opportunities/${opportunity.id}`)}
                            className="bg-[#EDFFD7] border-[#c8d6bf] text-[#787274] hover:bg-[#e0f5c8] hover:border-[#b8c6af]"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loadingOpportunities && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, sortedOpportunities.length)} of {sortedOpportunities.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 px-3 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {referrer && (
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          organisationId={referrer.organisation_id}
          organisationName={referrer.organisation?.company_name || 'Organisation'}
          onInviteSent={() => {
            fetchInvitations();
            fetchOrganisationUsers();
          }}
        />
      )}

      <EditUserDialog
        open={editUserDialogOpen}
        onOpenChange={setEditUserDialogOpen}
        user={selectedUser}
        isAccountOwner={selectedUser?.id === referrer?.user?.id}
        onSuccess={() => {
          toast({
            title: 'Success',
            description: 'User updated successfully',
          });
          fetchOrganisationUsers();
        }}
      />

      {/* Commission Split Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Custom Commission Split</DialogTitle>
            <DialogDescription>
              Add a custom commission split for this Referrer below.
              This will display inside the Referrer portal only.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Custom Commission Split</label>
            <Textarea
              value={editingCommission}
              onChange={(e) => setEditingCommission(e.target.value)}
              placeholder="Enter custom commission split details..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCommission}
              disabled={savingCommission}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {savingCommission ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}