'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  TrendingUp,
  ChevronDown,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'date_settled', label: 'Date Settled' },
  { value: 'closed', label: 'Closed' },
];

interface Settlement {
  id: string;
  opportunity_id: string;
  entity_name: string;
  referrer_group: string;
  target_settlement_date: string | null;
  date_settled: string | null;
  loan_amount: number;
  lender: string;
  status: string;
  is_closed: boolean;
}

function SettlementsContent() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([]);
  const [sortKey, setSortKey] = useState<string | null>('date_settled');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchSettlements();
  }, []);

  useEffect(() => {
    // Apply status filter
    let filtered = settlements.filter(settlement => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'date_settled') return !!settlement.date_settled;
      if (statusFilter === 'closed') return settlement.is_closed;
      return true;
    });

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(settlement =>
        settlement.opportunity_id.toLowerCase().includes(search) ||
        settlement.entity_name.toLowerCase().includes(search) ||
        settlement.referrer_group.toLowerCase().includes(search) ||
        settlement.lender.toLowerCase().includes(search)
      );
    }

    setFilteredSettlements(filtered);
    setCurrentPage(1);
  }, [searchTerm, settlements, statusFilter]);

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/admin/settlements/upcoming');

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching settlements:', error);
        return;
      }

      const data = await response.json();

      setSettlements(data.settlements || []);
      setFilteredSettlements(data.settlements || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isClosed: boolean) => {
    if (isClosed) {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Closed</Badge>;
    }

    const statusMap: { [key: string]: { label: string; className: string } } = {
      'settled': { label: 'Settled', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      'conditionally_approved': { label: 'Conditionally Approved', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      'approved': { label: 'Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      'application_submitted': { label: 'Application Submitted', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      'application_created': { label: 'Application Created', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      'declined': { label: 'Declined', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      'withdrawn': { label: 'Withdrawn', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
    };

    const statusInfo = statusMap[status] || { label: status?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedSettlements = [...filteredSettlements].sort((a, b) => {
    if (!sortKey) return 0;
    let aValue: any = a[sortKey as keyof Settlement];
    let bValue: any = b[sortKey as keyof Settlement];

    // Handle dates
    if (sortKey === 'target_settlement_date' || sortKey === 'date_settled') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle numbers
    if (sortKey === 'loan_amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle strings
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedSettlements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSettlements = sortedSettlements.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#02383B]">Settlements</h1>
          <p className="text-gray-500 mt-1">
            Applications with Date Settled or marked as Closed
          </p>
        </div>
      </div>

      {/* Main Settlements Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Settlements</h2>
            <div className="flex items-center gap-3">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 hover:border-gray-400 transition-colors min-w-[160px]">
                    {FILTER_OPTIONS.find(o => o.value === statusFilter)?.label}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value);
                        setFilterOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {statusFilter === option.value ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <span className="w-4 flex-shrink-0" />
                      )}
                      <span className={statusFilter === option.value ? 'text-green-600 font-medium' : 'text-gray-700'}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden p-10">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <SortableTableHead
                  label="Deal ID"
                  sortKey="opportunity_id"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Borrowing Entity"
                  sortKey="entity_name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Referrer Group"
                  sortKey="referrer_group"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Date Settled"
                  sortKey="date_settled"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Loan Amount"
                  sortKey="loan_amount"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Lender"
                  sortKey="lender"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? 'No settlements found matching your search' : 'No settlements found'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSettlements.map((settlement) => (
                  <TableRow
                    key={settlement.id}
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/admin/opportunities/${settlement.id}`)}
                  >
                    <TableCell className="font-medium">
                      {settlement.opportunity_id}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {settlement.entity_name}
                    </TableCell>
                    <TableCell>
                      {settlement.referrer_group}
                    </TableCell>
                    <TableCell>
                      {formatDate(settlement.date_settled)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(settlement.loan_amount)}
                    </TableCell>
                    <TableCell>
                      {settlement.lender}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(settlement.status, settlement.is_closed)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedSettlements.length)} of {sortedSettlements.length} entries
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
      </div>
    </div>
  );
}

export default function SettlementsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <SettlementsContent />
    </Suspense>
  );
}
