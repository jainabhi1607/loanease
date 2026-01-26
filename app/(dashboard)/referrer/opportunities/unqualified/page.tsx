'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';

interface UnqualifiedOpportunity {
  id: string;
  opportunity_id: string;
  client_entity_name: string;
  client_contact_name: string;
  loan_amount: number;
  status: string;
  unqualified_date: string;
  unqualified_reason: string;
  created_at: string;
}

function UnqualifiedOpportunitiesContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<UnqualifiedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchUnqualifiedOpportunities();
  }, []);

  const fetchUnqualifiedOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/referrer/opportunities/unqualified');

      if (!response.ok) {
        throw new Error('Failed to fetch unqualified opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error('Error fetching unqualified opportunities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load unqualified opportunities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '-';
    return `$${parseFloat(amount.toString()).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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
    let aValue: any = a[sortKey as keyof UnqualifiedOpportunity];
    let bValue: any = b[sortKey as keyof UnqualifiedOpportunity];

    // Handle dates
    if (sortKey === 'created_at' || sortKey === 'unqualified_date') {
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
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedOpportunities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOpportunities = sortedOpportunities.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/referrer/opportunities')}
                className="text-[#787274] hover:text-[#02383B]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Opportunities
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-[#02383B]">Unqualified Opportunities</h1>
            <p className="text-[#787274] mt-1">View opportunities that have been marked as unqualified</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#FFF8E7] rounded-xl overflow-hidden p-10">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
            <p className="mt-4 text-[#787274]">Loading unqualified opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#787274]">No unqualified opportunities found</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-orange-200">
                <tr>
                  <SortableTableHead
                    label="Deal ID"
                    sortKey="opportunity_id"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Date Created"
                    sortKey="created_at"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Borrowing Entity"
                    sortKey="client_entity_name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Contact Name"
                    sortKey="client_contact_name"
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
                    label="Unqualified Date"
                    sortKey="unqualified_date"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {paginatedOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-orange-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#02383B]">
                      {opp.opportunity_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#787274]">
                      {formatDate(opp.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#02383B]">
                      {opp.client_entity_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#02383B]">
                      {opp.client_contact_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#02383B]">
                      {formatCurrency(opp.loan_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#787274]">
                      {formatDate(opp.unqualified_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/referrer/opportunities/${opp.id}`)}
                        className="bg-white border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && sortedOpportunities.length > 0 && (
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

export default function ReferrerUnqualifiedOpportunitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          </div>
        </div>
      </div>
    }>
      <UnqualifiedOpportunitiesContent />
    </Suspense>
  );
}
