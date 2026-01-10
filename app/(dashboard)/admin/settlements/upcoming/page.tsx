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
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';

interface Settlement {
  id: string;
  opportunity_id: string;
  entity_name: string;
  referrer_group: string;
  target_settlement_date: string;
  loan_amount: number;
  lender: string;
  status: string;
}

function UpcomingSettlementsContent() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([]);
  const [sortKey, setSortKey] = useState<string | null>('target_settlement_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchSettlements();
  }, []);

  useEffect(() => {
    // Filter settlements based on search term
    const filtered = settlements.filter(settlement =>
      settlement.opportunity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.referrer_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.lender.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSettlements(filtered);
  }, [searchTerm, settlements]);

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/admin/settlements/upcoming');

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching settlements:', error);
        return;
      }

      const data = await response.json();
      console.log('Settlements data:', data.settlements);

      setSettlements(data.settlements || []);
      setFilteredSettlements(data.settlements || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      'conditionally_approved': { label: 'Conditionally Approved', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      'approved': { label: 'Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      'application_submitted': { label: 'Application Submitted', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      'application_created': { label: 'Application Created', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    };

    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
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

  const getDaysUntilSettlement = (targetDate: string) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="text-red-600 font-medium">Overdue by {Math.abs(diffDays)} days</span>;
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-medium">Today</span>;
    } else if (diffDays <= 7) {
      return <span className="text-orange-600 font-medium">{diffDays} days</span>;
    } else if (diffDays <= 30) {
      return <span className="text-blue-600 font-medium">{diffDays} days</span>;
    } else {
      return <span className="text-gray-600">{diffDays} days</span>;
    }
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
    if (sortKey === 'target_settlement_date') {
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
          <h1 className="text-2xl font-bold text-[#02383B]">Upcoming Settlements</h1>
          <p className="text-gray-500 mt-1">
            Track opportunities with scheduled settlement dates
          </p>
        </div>
      </div>

      {/* Main Settlements Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Settlements</h2>
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

        {/* Table */}
        <div className="overflow-x-auto p-10">
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
                  label="Target Settlement"
                  sortKey="target_settlement_date"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <TableHead className="text-[#787274] font-normal">Days Until</TableHead>
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
                    {searchTerm ? 'No settlements found matching your search' : 'No upcoming settlements'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSettlements.map((settlement) => (
                  <TableRow
                    key={settlement.id}
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/admin/opportunities/${settlement.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <div className="font-medium">{settlement.opportunity_id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {settlement.entity_name}
                    </TableCell>
                    <TableCell>
                      {settlement.referrer_group}
                    </TableCell>
                    <TableCell>
                      {formatDate(settlement.target_settlement_date)}
                    </TableCell>
                    <TableCell>
                      {getDaysUntilSettlement(settlement.target_settlement_date)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(settlement.loan_amount)}
                    </TableCell>
                    <TableCell>
                      {settlement.lender}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(settlement.status)}
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

export default function UpcomingSettlementsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <UpcomingSettlementsContent />
    </Suspense>
  );
}
