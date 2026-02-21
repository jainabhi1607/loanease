'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  Pencil,
  Loader2
} from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditClientDialog } from '@/components/EditClientDialog';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  entity: string;
  entity_name: string;
  borrower_contact: string;
  mobile: string;
  email: string;
  industry: string;
  company_address: string;
  referrer_group: string;
  abn?: string;
  time_in_business?: string;
}

interface Opportunity {
  id: string;
  opportunity_id: string;
  date_created: string;
  borrowing_entity: string;
  referrer_name: string;
  referrer_type: string;
  loan_amount: number;
  status: string;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalFinanceAmount, setTotalFinanceAmount] = useState(0);
  const [upcomingSettlements, setUpcomingSettlements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    params.then(({ id }) => {
      setClientId(id);
    });
  }, [params]);

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch client details');
      }

      const data = await response.json();
      setClient(data.client);
      setOpportunities(data.opportunities);
      setTotalFinanceAmount(data.total_finance_amount);
      setUpcomingSettlements(data.upcoming_settlements);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    toast({
      title: 'Client updated',
      description: 'Client details have been updated successfully.',
    });
    fetchClientDetails();
  };

  const handleDeleteClient = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete client');
      }

      toast({
        title: 'Client deleted',
        description: 'Client has been deleted successfully.',
      });
      router.push('/admin/clients');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete client',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatEntityType = (entity: string) => {
    const entityTypes: { [key: string]: string } = {
      '1': 'Private company',
      '2': 'Sole trader',
      '3': 'SMSF Trust',
      '4': 'Trust',
      '5': 'Partnership',
      '6': 'Individual'
    };
    return entityTypes[entity] || '-';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      'withdrawn': { label: 'Withdrawn', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      'application_created': { label: 'Application Created', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
      'application_submitted': { label: 'Application Submitted', className: 'bg-teal-100 text-teal-800 hover:bg-teal-100' },
      'opportunity': { label: 'Opportunity', className: 'bg-[#00D37F] text-white hover:bg-[#00D37F]' },
      'conditionally_approved': { label: 'Conditionally Approved', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      'approved': { label: 'Approved', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      'settled': { label: 'Settled', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    };

    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-[#02383B]">Client not found</h3>
          <Button onClick={() => router.push('/admin/clients')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/clients')}
              className="text-[#787274] hover:text-[#02383B]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#02383B]">{client.entity_name}</h1>
                {client.referrer_group && (
                  <Badge variant="outline" className="text-sm font-medium bg-[#EDFFD7] text-[#02383B] border-[#00D37F]">
                    {client.referrer_group}
                  </Badge>
                )}
              </div>
              {client.referrer_group && (
                <p className="text-sm text-[#787274] mt-1">Referrer Group</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setEditClientOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Client
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-10">
              <h3 className="text-lg font-semibold text-[#02383B] mb-6">Client Details</h3>
              <div className="divide-y divide-gray-200">
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Borrowing Entity Type</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{formatEntityType(client.entity)}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Borrowing Entity Name</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.entity_name || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Borrower Contact</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.borrower_contact || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Mobile</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.mobile || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Email</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.email || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Company Address</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.company_address || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">ABN</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.abn || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Time in Business</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.time_in_business || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <span className="text-sm text-[#00857C]">Industry</span>
                  <span className="col-span-2 text-sm font-semibold text-[#02383B]">{client.industry || '-'}</span>
                </div>
              </div>
            </div>

            {/* Opportunities Table */}
            <div className="bg-[#EDFFD7] rounded-lg overflow-hidden p-10">
              <h3 className="text-lg font-semibold text-[#02383B] mb-4">Opportunities</h3>
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#c8e6c9] hover:bg-transparent">
                      <TableHead className="text-[#787274] font-normal">Deal ID</TableHead>
                      <TableHead className="text-[#787274] font-normal">Date Created</TableHead>
                      <TableHead className="text-[#787274] font-normal">Borrowing Entity</TableHead>
                      <TableHead className="text-[#787274] font-normal">Referrer Name</TableHead>
                      <TableHead className="text-[#787274] font-normal">Loan Amount</TableHead>
                      <TableHead className="text-[#787274] font-normal">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#787274]">
                          No opportunities found
                        </TableCell>
                      </TableRow>
                    ) : (
                      opportunities.map((opp) => (
                        <TableRow
                          key={opp.id}
                          className="border-b border-[#c8e6c9] hover:bg-[#dcedc8] cursor-pointer"
                          onClick={() => router.push(`/admin/opportunities/${opp.id}`)}
                        >
                          <TableCell className="font-bold text-[#787274]">{opp.opportunity_id}</TableCell>
                          <TableCell className="text-[#787274]">{formatDate(opp.date_created)}</TableCell>
                          <TableCell className="font-bold text-[#787274]">{opp.borrowing_entity}</TableCell>
                          <TableCell className="text-[#787274]">{opp.referrer_name}</TableCell>
                          <TableCell className="font-bold text-[#787274]">{formatCurrency(opp.loan_amount)}</TableCell>
                          <TableCell>{getStatusBadge(opp.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-6">
            {/* Total Finance Amount */}
            <div className="bg-[#02383B] rounded-lg p-10">
              <h4 className="text-sm font-medium text-white mb-2">Total Finance Amount</h4>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalFinanceAmount)}</p>
            </div>

            {/* Upcoming Settlements */}
            <div className="bg-white rounded-lg p-10 border border-[#E7EBEF]">
              <h4 className="text-base font-semibold text-[#02383B] mb-2">Settlements</h4>
              <p className="text-[#787274] text-sm">
                {upcomingSettlements > 0
                  ? `There are ${upcomingSettlements} upcoming settlement${upcomingSettlements !== 1 ? 's' : ''}.`
                  : 'There are currently no upcoming settlements.'}
              </p>
            </div>

            {/* Delete Button */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <TrashIcon size={16} />
              Delete Client
            </Button>
          </div>
        </div>

        {/* Edit Client Dialog */}
        <EditClientDialog
          client={client}
          open={editClientOpen}
          onOpenChange={setEditClientOpen}
          onSuccess={handleEditSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the client <strong>{client.entity_name}</strong>. Clients with active opportunities cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClient}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
