'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';

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

export default function LoginHistoryPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchLoginHistory();
  }, [search, statusFilter, currentPage]);

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/admin/login-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch login history');

      const data = await response.json();
      setLoginHistory(data.loginHistory || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load login history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      case 'blocked':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Super Admin</Badge>;
      case 'admin_team':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Admin</Badge>;
      case 'referrer_admin':
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Referrer Admin</Badge>;
      case 'referrer_team':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Referrer Team</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedLoginHistory = [...loginHistory].sort((a, b) => {
    if (!sortKey) return 0;
    let aValue: any = a[sortKey as keyof LoginHistoryEntry];
    let bValue: any = b[sortKey as keyof LoginHistoryEntry];

    // Handle dates
    if (sortKey === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
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

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/admin/settings">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Login History</h2>
            <p className="mt-1 text-sm text-gray-500">
              View all login attempts for all users ({total} total records)
            </p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by email or IP address..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Date & Time"
                    sortKey="created_at"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="User"
                    sortKey="user_name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Email"
                    sortKey="email"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Role"
                    sortKey="user_role"
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
                  <SortableTableHead
                    label="IP Address"
                    sortKey="ip_address"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sortedLoginHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No login history found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLoginHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell>{entry.user_name || '-'}</TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        {entry.user_role ? getRoleBadge(entry.user_role) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.ip_address || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.failure_reason || '-'}
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, total)} of {total} entries
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
    </div>
  );
}
