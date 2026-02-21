'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Plus, CircleMinus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';

interface Opportunity {
  id: string;
  opportunity_id: string;
  status: string;
  created_at: string;
  loan_amount: number;
  loan_type: string;
  borrowing_entity: string;
  contact_name: string;
  referrer_name?: string;
  referrer_type?: string;
}

export default function ReferrerOpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [drafts, setDrafts] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const [oppsResponse, draftsResponse] = await Promise.all([
        fetch('/api/referrer/opportunities?status=opportunity'),
        fetch('/api/referrer/opportunities?status=draft')
      ]);

      const oppsData = await oppsResponse.json();
      const draftsData = await draftsResponse.json();

      if (oppsResponse.ok) {
        setOpportunities(oppsData || []);
      }

      if (draftsResponse.ok) {
        setDrafts(draftsData || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOpportunity = (id: string) => {
    router.push(`/referrer/opportunities/${id}`);
  };

  const handleEditDraft = (id: string) => {
    router.push(`/referrer/opportunities/${id}/edit`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'opportunity': return 'bg-[#00D37F] text-white';
      case 'application_created':
      case 'application_submitted': return 'bg-blue-100 text-blue-800';
      case 'conditionally_approved': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'settled': return 'bg-purple-100 text-purple-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

    let aValue: string | number | Date = a[sortKey as keyof Opportunity] as string | number;
    let bValue: string | number | Date = b[sortKey as keyof Opportunity] as string | number;

    if (sortKey === 'created_at') {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    }

    if (sortKey === 'loan_amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedOpportunities.length / itemsPerPage);
  const paginatedOpportunities = sortedOpportunities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D37F]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#02383B]">Opportunities</h1>
            <p className="text-[#787274] mt-1">Track and manage potential referral opportunities</p>
          </div>
          <div className="flex gap-3">
            <Link href="/referrer/opportunities/unqualified">
              <Button
                variant="outline"
                className="bg-white border-[#02383B] text-[#02383B] hover:bg-gray-50"
              >
                <CircleMinus className="h-4 w-4 mr-2" />
                Unqualified Opportunities
              </Button>
            </Link>
            <Link href="/referrer/opportunities/add">
              <Button className="bg-[#00D37F] text-white hover:bg-[#00b86e]">
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </Link>
          </div>
        </div>

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden p-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#02383B]">Drafts</h2>
            </div>
            <div className="overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white border-y border-gray-200">
                    <TableHead className="font-normal text-[#787274] py-4">Deal ID</TableHead>
                    <TableHead className="font-normal text-[#787274] py-4">Date Created</TableHead>
                    <TableHead className="font-normal text-[#787274] py-4">Borrowing Entity</TableHead>
                    <TableHead className="font-normal text-[#787274] py-4 text-center">Loan Type</TableHead>
                    <TableHead className="font-normal text-[#787274] py-4 text-center">Loan Amount</TableHead>
                    <TableHead className="font-normal text-[#787274] py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id} className="bg-white border-b border-gray-200">
                      <TableCell className="py-4 font-bold text-[#787274]">{draft.opportunity_id}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{formatDate(draft.created_at)}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274]">{draft.borrowing_entity || '-'}</TableCell>
                      <TableCell className="py-4 text-[#787274] text-center">{formatLoanType(draft.loan_type)}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274] text-center">{formatCurrency(draft.loan_amount)}</TableCell>
                      <TableCell className="py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleEditDraft(draft.id)}
                          className="bg-[#FFF8D7] border-0 text-[#787274] hover:bg-[#fff3c4]"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Continue Editing
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Recent Opportunities Section */}
        <div className="bg-[#EDFFD7] rounded-xl overflow-hidden p-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#02383B]">Recent Opportunities</h2>
          </div>

          {sortedOpportunities.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#787274]">No opportunities yet</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#EDFFD7] border-y border-[#d4f0b8]">
                    <SortableTableHead
                      label="Deal ID"
                      sortKey="opportunity_id"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <SortableTableHead
                      label="Date Created"
                      sortKey="created_at"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <SortableTableHead
                      label="Borrowing Entity"
                      sortKey="borrowing_entity"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <SortableTableHead
                      label="Loan Type"
                      sortKey="loan_type"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <SortableTableHead
                      label="Referrer Name"
                      sortKey="referrer_name"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <TableHead className="font-normal text-[#787274] py-4">Referrer Type</TableHead>
                    <SortableTableHead
                      label="Loan Amount"
                      sortKey="loan_amount"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <SortableTableHead
                      label="Status"
                      sortKey="status"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="font-normal text-[#787274] py-4"
                    />
                    <TableHead className="font-normal text-[#787274] py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOpportunities.map((opp) => (
                    <TableRow key={opp.id} className="bg-[#EDFFD7] border-b border-[#d4f0b8]">
                      <TableCell className="py-4 font-bold text-[#787274]">{opp.opportunity_id}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{formatDate(opp.created_at)}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274]">{opp.borrowing_entity || '-'}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{formatLoanType(opp.loan_type)}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{opp.referrer_name || '-'}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{opp.referrer_type || '-'}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274]">{formatCurrency(opp.loan_amount)}</TableCell>
                      <TableCell className="py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                          {formatStatus(opp.status)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOpportunity(opp.id)}
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
          {sortedOpportunities.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={sortedOpportunities.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}
