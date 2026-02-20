'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

function PotentialReferrersContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    // Filter contacts based on search term
    const filtered = contacts.filter(contact =>
      contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredContacts(filtered);
  }, [searchTerm, contacts]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/admin/potential-referrers');
      const data = await response.json();

      if (response.ok) {
        setContacts(data.contacts || []);
        setFilteredContacts(data.contacts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load potential referrers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/potential-referrers/export/csv');

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Potential-Referrers-${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'CSV Downloaded',
        description: 'Potential referrers data has been exported successfully.',
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

  const handleDeleteClick = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      const response = await fetch(`/api/admin/potential-referrers/${contactToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      });

      // Refresh the list
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof Contact];
    let bValue: any = b[sortKey as keyof Contact];

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
          <h1 className="text-2xl font-bold text-[#02383B]">Potential Referrers</h1>
          <p className="text-gray-500 mt-1">
            Manage contacts from pre-assessment tool submissions
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleDownloadCSV}
          disabled={isDownloading || contacts.length === 0}
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

      {/* Main Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Potential Referrers</h2>
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
                <TableHead className="w-16 text-[#787274] font-normal">S. No.</TableHead>
                <SortableTableHead
                  label="Date"
                  sortKey="created_at"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-[#787274]"
                />
                <SortableTableHead
                  label="Name"
                  sortKey="first_name"
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
                <TableHead className="w-24 text-center text-[#787274] font-normal">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchTerm ? 'No potential referrers found matching your search' : 'No potential referrers found'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedContacts.map((contact, index) => (
                  <TableRow key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(contact.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-gray-400" />
                        <div className="font-semibold">
                          {contact.first_name} {contact.last_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={(e) => handleDeleteClick(contact, e)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                      >
                        Delete?
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer with count */}
        {filteredContacts.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredContacts.length} of {contacts.length} potential referrer{contacts.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact for{' '}
              <strong>
                {contactToDelete?.first_name} {contactToDelete?.last_name}
              </strong>{' '}
              ({contactToDelete?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PotentialReferrersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <PotentialReferrersContent />
    </Suspense>
  );
}
