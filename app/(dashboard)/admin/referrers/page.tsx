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
  Plus,
  Building,
  Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { AddReferrerDialog } from '@/components/AddReferrerDialog';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';

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
}

function ReferrersContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReferrers, setFilteredReferrers] = useState<Referrer[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchReferrers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    // Filter referrers based on search term
    const term = searchTerm.toLowerCase();
    const filtered = referrers.filter(referrer =>
      (referrer.company_name || '').toLowerCase().includes(term) ||
      (referrer.contact_name || '').toLowerCase().includes(term) ||
      (referrer.email || '').toLowerCase().includes(term) ||
      (referrer.state || '').toLowerCase().includes(term)
    );
    setFilteredReferrers(filtered);
  }, [searchTerm, referrers]);

  const fetchReferrers = async () => {
    try {
      // Use API route that has proper permissions
      const response = await fetch('/api/admin/referrers');
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching referrers:', error);
        return;
      }
      
      const data = await response.json();
      console.log('Referrers data:', data.referrers);
      
      setReferrers(data.referrers || []);
      setFilteredReferrers(data.referrers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-[#00d169] text-white hover:bg-[#00d169]">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-[#FF6467] text-white hover:bg-[#FF6467]">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedReferrers = [...filteredReferrers].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof Referrer];
    let bValue: any = b[sortKey as keyof Referrer];

    if (sortKey === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = (aValue || '').toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedReferrers.length / itemsPerPage);
  const paginatedReferrers = sortedReferrers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/referrers/export/csv');

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Referrers-${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'CSV Downloaded',
        description: 'Referrers data has been exported successfully.',
      });
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download CSV file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-[#02383B]">Referrers</h1>
          <p className="text-gray-500 mt-1">
            Manage referrer organisations and their key contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleDownloadCSV}
            disabled={isDownloading || referrers.length === 0}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download CSV
              </>
            )}
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Referrer
          </Button>
        </div>
      </div>

      {/* Main Referrers Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Referrers</h2>
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
        <div className="overflow-hidden p-10">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <SortableTableHead
                  label="Referrer Group"
                  sortKey="company_name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Key Contact Name"
                  sortKey="contact_name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Email"
                  sortKey="email"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Phone"
                  sortKey="phone"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="State"
                  sortKey="state"
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
                <SortableTableHead
                  label="Joined"
                  sortKey="created_at"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] min-w-[130px]"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchTerm ? 'No referrers found matching your search' : 'No referrers found'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReferrers.map((referrer) => (
                  <TableRow
                    key={referrer.id}
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/admin/referrers/${referrer.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <div className="font-semibold">{referrer.company_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {referrer.contact_name}
                    </TableCell>
                    <TableCell>
                      {referrer.email}
                    </TableCell>
                    <TableCell>
                      {referrer.phone}
                    </TableCell>
                    <TableCell>
                      {referrer.state}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(referrer.status)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(referrer.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {sortedReferrers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedReferrers.length}
          />
        )}
      </div>

      {/* Add Referrer Dialog */}
      <AddReferrerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onReferrerAdded={() => {
          fetchReferrers();
        }}
      />
    </div>
  );
}

export default function ReferrersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <ReferrersContent />
    </Suspense>
  );
}