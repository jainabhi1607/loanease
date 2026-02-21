'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

interface Application {
  id: string;
  deal_id: string;
  date_created: string;
  borrowing_entity: string;
  loan_type: string;
  referrer_name: string;
  referrer_type: string;
  loan_amount: number;
  status: string;
  deal_finalisation_status: string | null;
  completed_declined_reason: string | null;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Applications' },
  { value: 'application_created', label: 'Application Created' },
  { value: 'application_submitted', label: 'Application Submitted' },
  { value: 'application_decision', label: 'Application Decision' },
  { value: 'application_completed', label: 'Application Completed' },
  { value: 'application_closed', label: 'Application Closed' },
];

function ApplicationsContent() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>('date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      // Filter to show only applications (status >= application_created)
      const response = await fetch('/api/admin/opportunities?status=applications');
      const data = await response.json();

      if (response.ok) {
        setApplications(data.opportunities || []);
      } else {
        console.error('Failed to fetch applications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplication = (id: string) => {
    router.push(`/admin/opportunities/${id}?from=applications`);
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'application_created':
      case 'application_submitted':
        return 'bg-blue-100 text-blue-800';
      case 'conditionally_approved':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800';
      case 'settled':
        return 'bg-purple-100 text-purple-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  // Filter applications based on status filter
  const statusFilteredApplications = applications.filter((app) => {
    switch (statusFilter) {
      case 'all':
        return true;
      case 'application_created':
        return app.status === 'application_created';
      case 'application_submitted':
        return app.status === 'application_submitted';
      case 'application_decision':
        return ['conditionally_approved', 'approved'].includes(app.status) ||
          (app.status === 'declined' && !app.completed_declined_reason);
      case 'application_completed':
        return ['settled', 'withdrawn'].includes(app.status) ||
          (app.status === 'declined' && !!app.completed_declined_reason);
      case 'application_closed':
        return !!app.deal_finalisation_status;
      default:
        return true;
    }
  });

  // Filter applications based on search term
  const filteredApplications = statusFilteredApplications.filter((app) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      app.deal_id?.toLowerCase().includes(searchLower) ||
      app.borrowing_entity?.toLowerCase().includes(searchLower) ||
      app.referrer_name?.toLowerCase().includes(searchLower) ||
      app.referrer_type?.toLowerCase().includes(searchLower) ||
      formatLoanType(app.loan_type)?.toLowerCase().includes(searchLower) ||
      formatStatus(app.status)?.toLowerCase().includes(searchLower)
    );
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof Application];
    let bValue: any = b[sortKey as keyof Application];

    if (sortKey === 'date_created') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortKey === 'loan_amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedApplications.length / itemsPerPage);
  const paginatedApplications = sortedApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#02383B]">Applications</h1>
          <p className="text-gray-500 mt-1">
            Manage loan applications that have progressed beyond opportunity stage.
          </p>
        </div>
      </div>

      {/* Main Applications Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">Applications</h2>
              <span className="text-gray-500 text-sm">({filteredApplications.length})</span>
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 hover:border-gray-400 transition-colors min-w-[200px]">
                    {FILTER_OPTIONS.find(o => o.value === statusFilter)?.label}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
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
            </div>
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

        {sortedApplications.length === 0 ? (
          <div className="p-10 text-center">
            {searchTerm ? (
              <>
                <p className="text-gray-500 mb-2">No applications found matching &quot;{searchTerm}&quot;</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">No applications yet</p>
                <p className="text-sm text-gray-400">
                  Applications will appear here when opportunities are converted to applications.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-hidden p-10">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <SortableTableHead
                    label="Deal ID"
                    sortKey="deal_id"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Date Created"
                    sortKey="date_created"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Borrowing Entity"
                    sortKey="borrowing_entity"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Loan Type"
                    sortKey="loan_type"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Referrer Name"
                    sortKey="referrer_name"
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
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274] min-w-[180px]"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedApplications.map((app) => (
                  <TableRow key={app.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewApplication(app.id)}>
                    <TableCell className="font-medium">{app.deal_id}</TableCell>
                    <TableCell>{formatDate(app.date_created)}</TableCell>
                    <TableCell className="font-semibold">{app.borrowing_entity}</TableCell>
                    <TableCell>{formatLoanType(app.loan_type)}</TableCell>
                    <TableCell>{app.referrer_name}</TableCell>
                    <TableCell>{formatCurrency(app.loan_amount)}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {formatStatus(app.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {sortedApplications.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedApplications.length}
          />
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading applications...</p>
        </div>
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  );
}
