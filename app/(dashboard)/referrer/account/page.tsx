'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Download, Check } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EditReferrerAccountDialog } from '@/components/EditReferrerAccountDialog';
import { AddReferrerUserDialog } from '@/components/AddReferrerUserDialog';
import { EditReferrerUserDialog } from '@/components/EditReferrerUserDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AccountData {
  organization: {
    id: string;
    entity_name: string;
    key_contact_name?: string;
    mobile?: string;
    email?: string;
    abn?: string;
    trading_name?: string;
    address?: string;
    industry_type?: string;
    entity_type?: string;
    is_active: boolean;
  };
  current_user: {
    id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
    state?: string;
    role: string;
  };
  directors: any[];
  users: any[];
  isTeamMember?: boolean;
}

interface LoginHistoryEntry {
  id: string;
  user_id: string | null;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export default function ReferrerAccountPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>}>
      <ReferrerAccountPage />
    </Suspense>
  );
}

function ReferrerAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commissionSplit, setCommissionSplit] = useState<string | null>(null);
  const [commissionSplitLoading, setCommissionSplitLoading] = useState(true);

  // Tab state - read from URL param on initial load
  const getInitialTab = (): 'account' | 'profile' | 'team-management' | 'login-history' => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'profile' || tabParam === 'team-management' || tabParam === 'login-history') {
      return tabParam;
    }
    return 'account';
  };
  const [activeTab, setActiveTab] = useState<'account' | 'profile' | 'team-management' | 'login-history'>(getInitialTab());

  // Login history state
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loginHistoryTotal, setLoginHistoryTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Login history filters
  const [statusFilters, setStatusFilters] = useState<{ success: boolean; failed: boolean; blocked: boolean }>({
    success: true,
    failed: true,
    blocked: true,
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    surname: '',
    email: '',
    phone: '',
    state: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Sync tab state with URL param when it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'profile' || tabParam === 'team-management' || tabParam === 'login-history') {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('account');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAccountData();
    fetchCommissionSplit();
  }, []);

  // Initialize profile form when account data is loaded
  useEffect(() => {
    if (accountData?.current_user) {
      setProfileForm({
        first_name: accountData.current_user.first_name || '',
        surname: accountData.current_user.surname || '',
        email: accountData.current_user.email || '',
        phone: accountData.current_user.phone || '',
        state: accountData.current_user.state || '',
      });
    }
  }, [accountData]);

  const fetchCommissionSplit = async () => {
    setCommissionSplitLoading(true);
    try {
      const response = await fetch('/api/referrer/account/commission-split');
      if (response.ok) {
        const data = await response.json();
        setCommissionSplit(data.commission_split);
      }
    } catch (error) {
      console.error('Error fetching commission split:', error);
    } finally {
      setCommissionSplitLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'login-history') {
      fetchLoginHistory();
    }
  }, [activeTab, currentPage, statusFilters]);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/referrer/account');

      if (!response.ok) {
        throw new Error('Failed to fetch account data');
      }
      const data = await response.json();
      setAccountData(data);

      // If team member, force profile tab
      if (data.isTeamMember) {
        setActiveTab('profile');
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load account data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;

      // Build status filter
      const activeStatuses = Object.entries(statusFilters)
        .filter(([_, isActive]) => isActive)
        .map(([status]) => status);

      const params = new URLSearchParams({
        status: activeStatuses.length === 3 ? 'all' : activeStatuses.join(','),
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/referrer/login-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch login history');

      const data = await response.json();
      setLoginHistory(data.loginHistory || []);
      setLoginHistoryTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load login history',
        variant: 'destructive',
      });
    } finally {
      setLoginHistoryLoading(false);
    }
  };

  const openDeleteDialog = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/referrer/account/delete-user/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchAccountData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setPasswordUpdated(false);

    try {
      // Validate password fields if showing and entered
      const hasPasswordInput = showPasswordFields && (passwordForm.new_password || passwordForm.confirm_password);
      if (hasPasswordInput) {
        if (passwordForm.new_password.length < 10) {
          toast({
            title: 'Error',
            description: 'New password must be at least 10 characters',
            variant: 'destructive',
          });
          setProfileSaving(false);
          return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
          toast({
            title: 'Error',
            description: 'Passwords do not match',
            variant: 'destructive',
          });
          setProfileSaving(false);
          return;
        }
      }

      const response = await fetch('/api/referrer/account/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: profileForm.first_name,
          surname: profileForm.surname,
          email: profileForm.email,
          phone: profileForm.phone,
          state: profileForm.state,
          ...(hasPasswordInput && {
            new_password: passwordForm.new_password,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.passwordUpdated) {
        setPasswordUpdated(true);
        setShowPasswordFields(false);
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }

      toast({
        title: 'Success',
        description: data.message || 'Profile updated successfully',
      });

      // Refresh account data
      fetchAccountData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  };

  const getRoleBadge = (role: string, isCurrentUser: boolean = false) => {
    if (isCurrentUser && role === 'referrer_admin') {
      return (
        <Badge className="bg-[#023838] text-white hover:bg-[#023838]">
          Account Owner
        </Badge>
      );
    }
    if (role === 'referrer_admin') {
      return (
        <Badge className="bg-[#00D169] text-white hover:bg-[#00D169]">
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#7161F2] text-white hover:bg-[#7161F2]">
        Team Member
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-[#00D169] text-white hover:bg-[#00D169]">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white hover:bg-red-500">Failed</Badge>;
      case 'blocked':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-500">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(loginHistoryTotal / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-[#787274]">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#787274]">No account data found</p>
      </div>
    );
  }

  const { organization, current_user, directors, users, isTeamMember } = accountData;

  // Team members only see Profile tab
  const tabs = isTeamMember
    ? [{ id: 'profile', label: 'Profile' }] as const
    : [
        { id: 'account', label: 'Account' },
        { id: 'profile', label: 'Profile' },
        { id: 'team-management', label: 'Team Management' },
        { id: 'login-history', label: 'Login History' },
      ] as const;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#02383B]">
            {current_user.first_name} {current_user.surname}
          </h1>
          {!isTeamMember && (
            <Badge
              className={
                organization.is_active
                  ? 'bg-[#00D37F] hover:bg-[#00D37F] text-white'
                  : 'bg-gray-500 hover:bg-gray-500 text-white'
              }
            >
              {organization.is_active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
        {!isTeamMember && (
          <Button
            variant="outline"
            onClick={() => setEditAccountOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
            </svg>
            Edit Account
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'account' | 'profile' | 'team-management' | 'login-history')}
              className={`px-6 py-3 text-sm text-teal-800 transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-teal-800 font-bold -mb-px'
                  : 'font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'account' && !isTeamMember && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - General Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information Card */}
            <div className="bg-white border border-[#E7EBEF] rounded-lg p-10">
              <h2 className="text-lg font-semibold mb-6 text-[#02383B]">General Information</h2>
              <div className="divide-y divide-[#E7EBEF]">
                <div className="grid grid-cols-3 py-4 first:pt-0">
                  <div className="text-sm text-[#787274]">Entity Name</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.entity_name || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">Key Contact Name</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B] flex items-center gap-2">
                    {organization.key_contact_name || '-'}
                    <Badge className="bg-[#B8F5D8] text-[#02383B] hover:bg-[#B8F5D8] font-medium">
                      Account Owner
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">Mobile</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.mobile || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">Email</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.email || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">ABN / GST No.</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">{organization.abn || '-'}</div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">Trading Name</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.trading_name || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4">
                  <div className="text-sm text-[#787274]">Address</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.address || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-3 py-4 last:pb-0">
                  <div className="text-sm text-[#787274]">Industry Type</div>
                  <div className="col-span-2 text-sm font-bold text-[#02383B]">
                    {organization.industry_type || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Split Card */}
            <div className="bg-[#EDFFD7] rounded-lg p-10">
              <h2 className="text-lg font-semibold mb-2 text-teal-800">Commission Split</h2>
              {commissionSplitLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                </div>
              ) : commissionSplit ? (
                <p className="text-sm text-[#787274]">{commissionSplit}</p>
              ) : (
                <p className="text-sm text-[#787274]">No commission split information available.</p>
              )}
            </div>

            {/* Directors Card */}
            <div className="bg-[#EDFFD7] rounded-lg p-10">
              <h2 className="text-lg font-semibold mb-4 text-teal-800">Directors</h2>
              <div className="space-y-3">
                {directors.length > 0 ? (
                  directors.map((director, index) => (
                    <div key={index} className="grid grid-cols-3">
                      <div className="text-sm text-[#787274]">Director</div>
                      <div className="col-span-2 text-sm font-medium">
                        {director.first_name} {director.surname}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#787274]">No additional directors</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Referral Agreement & Users */}
          <div className="space-y-6">
            {/* Referral Agreement Card */}
            <div className="bg-white border border-[#E7EBEF] rounded-lg p-10">
              <h2 className="text-lg font-semibold mb-2 text-[#02383B]">Referral Agreement</h2>
              <p className="text-sm text-[#787274] mb-4">
                You can download your referrer agreement here.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/referrer/account/download-agreement');
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
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Agreement
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-[#E7EBEF] rounded-lg p-10">
          {/* Password Updated Success Message */}
          {passwordUpdated && (
            <div className="mb-6 flex items-center gap-2 bg-[#00D169] text-white px-4 py-3 rounded-lg">
              <Check className="h-5 w-5" />
              <span className="font-medium">Password updated!</span>
            </div>
          )}

          {/* Your Profile Header */}
          <h2 className="text-lg font-semibold text-[#02383B] mb-6">Your Profile</h2>

          {/* Profile Info */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#00D37F] flex items-center justify-center text-white text-xl font-bold">
              {getUserInitials(current_user.first_name, current_user.surname)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#02383B]">
                {current_user.first_name} {current_user.surname}
              </h3>
              <p className="text-[#787274] text-sm">{current_user.email}</p>
              <div className="mt-1">
                {getRoleBadge(current_user.role, true)}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="first_name" className="text-[#02383B] font-semibold text-sm">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  value={profileForm.first_name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, first_name: e.target.value })
                  }
                  className="mt-2"
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="surname" className="text-[#02383B] font-semibold text-sm">
                  Last Name
                </Label>
                <Input
                  id="surname"
                  value={profileForm.surname}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, surname: e.target.value })
                  }
                  className="mt-2"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Email Address & Phone */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="text-[#02383B] font-semibold text-sm">
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                  className="mt-2"
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-[#02383B] font-semibold text-sm">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="mt-2"
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* State */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="state" className="text-[#02383B] font-semibold text-sm">
                  State
                </Label>
                <Select
                  value={profileForm.state}
                  onValueChange={(value) =>
                    setProfileForm({ ...profileForm, state: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AN">Andaman and Nicobar Islands</SelectItem>
                    <SelectItem value="AP">Andhra Pradesh</SelectItem>
                    <SelectItem value="AR">Arunachal Pradesh</SelectItem>
                    <SelectItem value="AS">Assam</SelectItem>
                    <SelectItem value="BR">Bihar</SelectItem>
                    <SelectItem value="CH">Chandigarh</SelectItem>
                    <SelectItem value="CT">Chhattisgarh</SelectItem>
                    <SelectItem value="DL">Delhi</SelectItem>
                    <SelectItem value="GA">Goa</SelectItem>
                    <SelectItem value="GJ">Gujarat</SelectItem>
                    <SelectItem value="HR">Haryana</SelectItem>
                    <SelectItem value="HP">Himachal Pradesh</SelectItem>
                    <SelectItem value="JK">Jammu and Kashmir</SelectItem>
                    <SelectItem value="JH">Jharkhand</SelectItem>
                    <SelectItem value="KA">Karnataka</SelectItem>
                    <SelectItem value="KL">Kerala</SelectItem>
                    <SelectItem value="LA">Ladakh</SelectItem>
                    <SelectItem value="MP">Madhya Pradesh</SelectItem>
                    <SelectItem value="MH">Maharashtra</SelectItem>
                    <SelectItem value="MN">Manipur</SelectItem>
                    <SelectItem value="ML">Meghalaya</SelectItem>
                    <SelectItem value="MZ">Mizoram</SelectItem>
                    <SelectItem value="NL">Nagaland</SelectItem>
                    <SelectItem value="OR">Odisha</SelectItem>
                    <SelectItem value="PB">Punjab</SelectItem>
                    <SelectItem value="RJ">Rajasthan</SelectItem>
                    <SelectItem value="SK">Sikkim</SelectItem>
                    <SelectItem value="TN">Tamil Nadu</SelectItem>
                    <SelectItem value="TG">Telangana</SelectItem>
                    <SelectItem value="TR">Tripura</SelectItem>
                    <SelectItem value="UP">Uttar Pradesh</SelectItem>
                    <SelectItem value="UT">Uttarakhand</SelectItem>
                    <SelectItem value="WB">West Bengal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>

            {/* Password Section */}
            <div className="pt-2">
              <Label className="text-[#02383B] font-semibold text-sm">Password</Label>

              {!showPasswordFields ? (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(true)}
                    className="text-[#00D37F] hover:text-[#00b86d] font-medium text-sm"
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 mt-2">
                  <div>
                    <Label htmlFor="new_password" className="text-[#00D37F] font-medium text-sm">
                      New Password
                    </Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, new_password: e.target.value })
                      }
                      className="mt-2"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm_password" className="text-[#00D37F] font-medium text-sm">
                      Repeat New Password
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                      }
                      className="mt-2"
                      placeholder=""
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Update Password Button */}
            <div className="pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-[#02383B] hover:bg-[#015456] text-white"
              >
                {profileSaving ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Tab */}
      {activeTab === 'team-management' && !isTeamMember && (
        <div>
          {/* Add User Button - Outside Card */}
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setAddUserOpen(true)}
              className="bg-[#02383B] hover:bg-[#015456] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          <div className="bg-[#EDFFD7] rounded-lg p-10">
            {/* Header */}
            <h2 className="text-lg font-semibold text-[#02383B] mb-6">Team Management</h2>

          {/* Users Table */}
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#d4f0b8] hover:bg-transparent">
                  <TableHead className="text-[#787274] font-normal">Name</TableHead>
                  <TableHead className="text-[#787274] font-normal">Phone</TableHead>
                  <TableHead className="text-[#787274] font-normal">Email</TableHead>
                  <TableHead className="text-[#787274] font-normal">State</TableHead>
                  <TableHead className="text-[#787274] font-normal">Role</TableHead>
                  <TableHead className="text-[#787274] font-normal">Status</TableHead>
                  <TableHead className="text-[#787274] font-normal text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#787274]">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-b border-[#d4f0b8] hover:bg-[#e0f5c8]">
                      <TableCell className="font-medium text-[#02383B]">
                        {user.first_name} {user.surname}
                      </TableCell>
                      <TableCell className="text-[#02383B]">{user.phone || '-'}</TableCell>
                      <TableCell className="text-[#02383B]">{user.email || '-'}</TableCell>
                      <TableCell className="text-[#02383B]">{user.state || '-'}</TableCell>
                      <TableCell>
                        {user.id === current_user.id ? (
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
                      <TableCell>
                        {user.is_active !== false ? (
                          <Badge className="bg-[#00d169] text-white hover:bg-[#00d169]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-[#FF6467] text-white hover:bg-[#FF6467]">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditUserOpen(true);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
                            </svg>
                          </Button>
                          {user.id !== current_user.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openDeleteDialog(user.id, `${user.first_name} ${user.surname}`)}
                            >
                              <TrashIcon className="text-gray-400 hover:text-red-600" size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === 'login-history' && !isTeamMember && (
        <div className="bg-[#ecfed6] rounded-lg overflow-hidden p-10">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-teal-800">Login History</h2>
            <p className="mt-1 text-sm text-[#787274]">
              View all your login attempts ({loginHistoryTotal} total records)
            </p>
          </div>

          {/* Table */}
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#c8e6c9] hover:bg-transparent">
                  <TableHead className="text-[#787274] font-normal">Date & Time</TableHead>
                  <TableHead className="text-[#787274] font-normal">Email</TableHead>
                  <TableHead className="text-[#787274] font-normal">Status</TableHead>
                  <TableHead className="text-[#787274] font-normal">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[#787274]">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : loginHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[#787274]">
                      No login history found
                    </TableCell>
                  </TableRow>
                ) : (
                  loginHistory.map((entry) => (
                    <TableRow key={entry.id} className="border-b border-[#c8e6c9] hover:bg-[#dcedc8]">
                      <TableCell className="whitespace-nowrap font-bold text-[#02383B]">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell className="font-bold text-[#02383B]">{entry.email}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-[#787274]">
                        {entry.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loginHistoryLoading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#c8e6c9] flex items-center justify-between">
              <div className="text-sm text-[#787274]">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, loginHistoryTotal)} of {loginHistoryTotal}{' '}
                entries
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
                <div className="flex items-center gap-2 px-3 text-sm text-[#787274]">
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
        </div>
      )}
      </div>

      {/* Edit Account Dialog */}
      <EditReferrerAccountDialog
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        currentUser={current_user}
        organization={organization}
        directors={directors}
        onSuccess={fetchAccountData}
      />

      {/* Add User Dialog */}
      <AddReferrerUserDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        onSuccess={fetchAccountData}
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditReferrerUserDialog
          open={editUserOpen}
          onOpenChange={setEditUserOpen}
          user={selectedUser}
          onSuccess={() => {
            fetchAccountData();
            toast({
              title: 'Success',
              description: 'User updated successfully',
            });
          }}
        />
      )}

      {/* Delete User Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Delete User"
        itemName={userToDelete?.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
