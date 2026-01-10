'use client';

import { useEffect, useState, Suspense } from 'react';
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
  Download,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';

interface Client {
  id: string;
  entity_name: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  state: string;
  referrer_group: string;
  referrer_name: string;
  opportunities_count: number;
  created_at: string;
}

function ClientsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Use the same API endpoint - it already filters by organization for referrers
      const response = await fetch('/api/admin/clients/all');

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching clients:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch clients. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();
      console.log('Clients data:', data.clients);

      setClients(data.clients || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/clients/export/csv');

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Clients-${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'CSV Downloaded',
        description: 'Clients data has been exported successfully.',
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
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

  const sortedClients = [...clients].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof Client];
    let bValue: any = b[sortKey as keyof Client];

    // Handle contact_name (computed field)
    if (sortKey === 'contact_name') {
      aValue = [a.first_name, a.last_name].filter(Boolean).join(' ').toLowerCase();
      bValue = [b.first_name, b.last_name].filter(Boolean).join(' ').toLowerCase();
    }

    // Handle opportunities_count (numeric)
    if (sortKey === 'opportunities_count') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle string comparisons
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-[75px] pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#02383B]">Clients</h1>
            <p className="mt-1 text-sm text-[#787274]">
              View and manage your organization&apos;s clients
            </p>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleDownloadCSV}
            disabled={isDownloading || clients.length === 0}
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
        </div>

        {/* Table */}
        <div className="bg-[#EDFFD7] rounded-lg overflow-hidden p-[40px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#c8e6c9] hover:bg-transparent">
                <SortableTableHead
                  label="Entity Name"
                  sortKey="entity_name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
                <SortableTableHead
                  label="Contact Name"
                  sortKey="contact_name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
                <SortableTableHead
                  label="Email"
                  sortKey="email"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
                <SortableTableHead
                  label="Mobile"
                  sortKey="mobile"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
                <SortableTableHead
                  label="State"
                  sortKey="state"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
                <SortableTableHead
                  label="Opportunities"
                  sortKey="opportunities_count"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274] font-normal"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#787274]">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => {
                  const contactName = [client.first_name, client.last_name]
                    .filter(Boolean)
                    .join(' ') || '-';

                  return (
                    <TableRow
                      key={client.id}
                      className="border-b border-[#c8e6c9] hover:bg-[#dcedc8] cursor-pointer"
                      onClick={() => router.push(`/referrer/clients/${client.id}`)}
                    >
                      <TableCell>
                        <span className="font-semibold text-teal-800 hover:text-teal-900">
                          {client.entity_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#787274]">{contactName}</TableCell>
                      <TableCell className="text-[#787274]">{client.email || '-'}</TableCell>
                      <TableCell className="text-[#787274]">{client.mobile || '-'}</TableCell>
                      <TableCell className="text-[#787274]">{client.state || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium bg-[#00D37F] text-white">
                          {client.opportunities_count}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {sortedClients.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedClients.length}
          />
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <ClientsContent />
    </Suspense>
  );
}
