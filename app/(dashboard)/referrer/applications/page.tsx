'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
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
  opportunity_id: string;
  status: string;
  created_at: string;
  loan_amount: number;
  loan_type: string;
  borrowing_entity: string;
  contact_name: string;
}

interface Stats {
  total: number;
  underReview: number;
  approved: number;
  declined: number;
}

export default function ReferrerApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<Stats>({ total: 0, underReview: 0, approved: 0, declined: 0 });
  const itemsPerPage = 20;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/referrer/opportunities?status=applications');
      const data = await response.json();

      if (response.ok) {
        setApplications(data || []);
        // Calculate stats
        const apps = data || [];
        setStats({
          total: apps.length,
          underReview: apps.filter((a: Application) =>
            ['application_created', 'application_submitted', 'conditionally_approved'].includes(a.status)
          ).length,
          approved: apps.filter((a: Application) => a.status === 'approved').length,
          declined: apps.filter((a: Application) => a.status === 'declined').length,
        });
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplication = (id: string) => {
    router.push(`/referrer/opportunities/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
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
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'application_created':
      case 'application_submitted':
        return 'bg-[#FFD75E] text-white';
      case 'conditionally_approved':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-[#00D37F] text-white';
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

  const sortedApplications = [...applications].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: string | number | Date = a[sortKey as keyof Application] as string | number;
    let bValue: string | number | Date = b[sortKey as keyof Application] as string | number;

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

  const totalPages = Math.ceil(sortedApplications.length / itemsPerPage);
  const paginatedApplications = sortedApplications.slice(
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#02383B]">Applications</h1>
          <p className="text-[#787274] mt-1">Track and manage potential referral opportunities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Total Applications */}
          <div className="bg-white rounded-xl border border-[#E7EBEF] p-[40px] flex items-center gap-[50px] h-[107px]">
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D37F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none tracking-normal text-[#787274]">Total Applications</p>
              <p className="text-[28px] font-bold leading-none tracking-normal text-[#02383B] mt-1">{stats.total}</p>
            </div>
          </div>

          {/* Under Review */}
          <div className="bg-white rounded-xl border border-[#E7EBEF] p-[40px] flex items-center gap-[50px] h-[107px]">
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D37F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none tracking-normal text-[#787274]">Under Review</p>
              <p className="text-[28px] font-bold leading-none tracking-normal text-[#02383B] mt-1">{stats.underReview}</p>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-xl border border-[#E7EBEF] p-[40px] flex items-center gap-[50px] h-[107px]">
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D37F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none tracking-normal text-[#787274]">Approved</p>
              <p className="text-[28px] font-bold leading-none tracking-normal text-[#02383B] mt-1">{stats.approved}</p>
            </div>
          </div>

          {/* Declined */}
          <div className="bg-white rounded-xl border border-[#E7EBEF] p-[40px] flex items-center gap-[50px] h-[107px]">
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D37F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none tracking-normal text-[#787274]">Declined</p>
              <p className="text-[28px] font-bold leading-none tracking-normal text-[#02383B] mt-1">{stats.declined}</p>
            </div>
          </div>
        </div>

        {/* Recent Applications Section */}
        <div className="bg-[#EDFFD7] rounded-xl overflow-hidden p-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#02383B]">Recent Applications</h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#787274]">No applications yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Applications will appear here once opportunities progress to the application stage.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      label="Contact Name"
                      sortKey="contact_name"
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
                  {paginatedApplications.map((app) => (
                    <TableRow key={app.id} className="bg-[#EDFFD7] border-b border-[#F9FFF2]">
                      <TableCell className="py-4 font-bold text-[#787274]">{app.opportunity_id}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{formatDate(app.created_at)}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274]">{app.borrowing_entity || '-'}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{app.contact_name || '-'}</TableCell>
                      <TableCell className="py-4 text-[#787274]">{formatLoanType(app.loan_type)}</TableCell>
                      <TableCell className="py-4 font-bold text-[#787274]">{formatCurrency(app.loan_amount)}</TableCell>
                      <TableCell className="py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewApplication(app.id)}
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
    </div>
  );
}
