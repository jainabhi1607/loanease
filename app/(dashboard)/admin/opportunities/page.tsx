'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Eye, Filter, Search, Download, X, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';

interface Opportunity {
  id: string;
  deal_id: string;
  date_created: string;
  borrowing_entity: string;
  loan_type: string;
  referrer_name: string;
  referrer_type: string;
  loan_amount: number;
  status: string;
}

function OpportunitiesContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [drafts, setDrafts] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entitySearchOpen, setEntitySearchOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Get unique borrowing entities sorted alphabetically
  const borrowingEntities = useMemo(() => {
    const entities = opportunities
      .map(opp => opp.borrowing_entity)
      .filter((entity): entity is string => !!entity && entity.trim() !== '')
      .filter((entity, index, self) => self.indexOf(entity) === index)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return entities;
  }, [opportunities]);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      // Fetch both opportunities and drafts
      const [oppsResponse, draftsResponse] = await Promise.all([
        fetch('/api/admin/opportunities?status=opportunity'),
        fetch('/api/admin/opportunities?status=draft')
      ]);

      const oppsData = await oppsResponse.json();
      const draftsData = await draftsResponse.json();

      if (oppsResponse.ok) {
        setOpportunities(oppsData.opportunities || []);
      } else {
        console.error('Failed to fetch opportunities:', oppsData.error);
      }

      if (draftsResponse.ok) {
        setDrafts(draftsData.opportunities || []);
      } else {
        console.error('Failed to fetch drafts:', draftsData.error);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOpportunity = () => {
    router.push('/admin/opportunities/add');
  };

  const handleViewOpportunity = (id: string) => {
    router.push(`/admin/opportunities/${id}`);
  };

  const handleEditDraft = (id: string) => {
    router.push(`/admin/opportunities/${id}/edit`);
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
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'opportunity':
        return 'bg-[#00D37F] text-white';
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
      // Toggle direction: asc -> desc -> asc
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, start with asc
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedEntity('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedEntity || fromDate || toDate;

  // Filter opportunities based on search term and filters
  const filteredOpportunities = opportunities.filter((opp) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        opp.deal_id?.toLowerCase().includes(searchLower) ||
        opp.borrowing_entity?.toLowerCase().includes(searchLower) ||
        opp.referrer_name?.toLowerCase().includes(searchLower) ||
        opp.referrer_type?.toLowerCase().includes(searchLower) ||
        formatLoanType(opp.loan_type)?.toLowerCase().includes(searchLower) ||
        formatStatus(opp.status)?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Borrowing entity filter
    if (selectedEntity && opp.borrowing_entity !== selectedEntity) {
      return false;
    }

    // Date range filter
    if (fromDate || toDate) {
      const oppDate = new Date(opp.date_created);
      oppDate.setHours(0, 0, 0, 0);

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (oppDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (oppDate > to) return false;
      }
    }

    return true;
  });

  // Export CSV function
  const handleExportCSV = () => {
    if (filteredOpportunities.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no opportunities to export.',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const headers = ['Deal ID', 'Date Created', 'Borrowing Entity', 'Loan Type', 'Referrer Name', 'Loan Amount', 'Status'];
      const rows = filteredOpportunities.map(opp => [
        opp.deal_id || '',
        formatDate(opp.date_created),
        opp.borrowing_entity || '',
        formatLoanType(opp.loan_type),
        opp.referrer_name || '',
        opp.loan_amount ? `$${opp.loan_amount.toLocaleString()}` : '',
        formatStatus(opp.status)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `opportunities-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Exported ${filteredOpportunities.length} opportunities to CSV.`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export CSV file.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF function
  const handleExportPDF = async () => {
    if (filteredOpportunities.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no opportunities to export.',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(2, 56, 59);
      doc.text('Opportunities Report', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(120, 114, 116);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, 14, 30);

      if (hasActiveFilters) {
        let filterText = 'Filters: ';
        if (selectedEntity) filterText += `Entity: ${selectedEntity}; `;
        if (fromDate) filterText += `From: ${fromDate}; `;
        if (toDate) filterText += `To: ${toDate}; `;
        doc.text(filterText, 14, 36);
      }

      autoTable(doc, {
        startY: hasActiveFilters ? 42 : 38,
        head: [['Deal ID', 'Date Created', 'Borrowing Entity', 'Loan Type', 'Loan Amount', 'Status']],
        body: filteredOpportunities.map(opp => [
          opp.deal_id || '',
          formatDate(opp.date_created),
          opp.borrowing_entity || '',
          formatLoanType(opp.loan_type),
          opp.loan_amount ? `$${opp.loan_amount.toLocaleString()}` : '-',
          formatStatus(opp.status)
        ]),
        headStyles: {
          fillColor: [0, 211, 127],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [237, 255, 215],
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      doc.save(`opportunities-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Export successful',
        description: `Exported ${filteredOpportunities.length} opportunities to PDF.`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF file.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof Opportunity];
    let bValue: any = b[sortKey as keyof Opportunity];

    // Handle date sorting
    if (sortKey === 'date_created') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle number sorting
    if (sortKey === 'loan_amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle string sorting (case-insensitive)
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedOpportunities.length / itemsPerPage);
  const paginatedOpportunities = sortedOpportunities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#02383B]">Opportunities</h1>
          <p className="text-gray-500 mt-1">
            Track and manage potential referral opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAddOpportunity}
            className="bg-[#00D37F] hover:bg-[#00b86d] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Opportunity
          </Button>
          <Button
            variant="outline"
            className="border-orange-400 text-orange-500 hover:bg-orange-50"
            onClick={() => router.push('/admin/opportunities/unqualified')}
          >
            Unqualified
          </Button>
          <Button
            variant="outline"
            className={`border-gray-300 ${hasActiveFilters ? 'bg-blue-50 border-blue-400 text-blue-600' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="bg-white border-[#00D37F] text-[#00D37F] hover:bg-[#f0fdf4]"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'CSV'}
          </Button>
          <Button
            variant="outline"
            className="bg-white border-[#00D37F] text-[#00D37F] hover:bg-[#f0fdf4]"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Borrowing Entity Dropdown with Search */}
            <div className="space-y-2">
              <Label htmlFor="entity">Borrowing Entity</Label>
              <Popover open={entitySearchOpen} onOpenChange={setEntitySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={entitySearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedEntity || "Select entity..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search entity..." />
                    <CommandList>
                      <CommandEmpty>No entity found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setSelectedEntity('');
                            setEntitySearchOpen(false);
                          }}
                        >
                          All Entities
                        </CommandItem>
                        {borrowingEntities.map((entity) => (
                          <CommandItem
                            key={entity}
                            value={entity}
                            onSelect={() => {
                              setSelectedEntity(entity);
                              setEntitySearchOpen(false);
                            }}
                          >
                            {entity}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {filteredOpportunities.length} of {opportunities.length} opportunities
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Drafts</h2>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-[#787274] font-normal">Deal ID</TableHead>
                  <TableHead className="text-[#787274] font-normal">Date Created</TableHead>
                  <TableHead className="text-[#787274] font-normal">Borrowing Entity</TableHead>
                  <TableHead className="text-[#787274] font-normal">Loan Type</TableHead>
                  <TableHead className="text-[#787274] font-normal">Loan Amount</TableHead>
                  <TableHead className="text-[#787274] font-normal text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => (
                  <TableRow key={draft.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium">{draft.deal_id}</TableCell>
                    <TableCell>{formatDate(draft.date_created)}</TableCell>
                    <TableCell className="font-semibold">{draft.borrowing_entity || '-'}</TableCell>
                    <TableCell>{formatLoanType(draft.loan_type)}</TableCell>
                    <TableCell>{draft.loan_amount ? formatCurrency(draft.loan_amount) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDraft(draft.id)}
                        className="bg-[#FFF8E7] border-[#FFF8E7] text-[#8B7355] hover:bg-[#FFEFC7] hover:border-[#FFEFC7]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M12 20h9"/>
                          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
                        </svg>
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

      {/* Main Opportunities Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Opportunities</h2>
            <div className="flex items-center gap-3">
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
              <Button
                onClick={handleAddOpportunity}
                className="bg-[#00D37F] hover:bg-[#00b86d] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Opportunity
              </Button>
            </div>
          </div>
        </div>

        {sortedOpportunities.length === 0 ? (
          <div className="p-10 text-center">
            {searchTerm ? (
              <>
                <p className="text-gray-500 mb-2">No opportunities found matching &quot;{searchTerm}&quot;</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              </>
            ) : opportunities.length === 0 ? (
              <>
                <p className="text-gray-500 mb-4">No opportunities yet</p>
                <Button
                  onClick={handleAddOpportunity}
                  variant="outline"
                  className="border-[#00D37F] text-[#00D37F] hover:bg-[#00D37F]/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Opportunity
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto p-10">
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
                    className="text-[#787274]"
                  />
                  <TableHead className="text-[#787274] font-normal text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOpportunities.map((opp) => (
                  <TableRow key={opp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium">{opp.deal_id}</TableCell>
                    <TableCell>{formatDate(opp.date_created)}</TableCell>
                    <TableCell className="font-semibold">{opp.borrowing_entity}</TableCell>
                    <TableCell>{formatLoanType(opp.loan_type)}</TableCell>
                    <TableCell>{opp.referrer_name}</TableCell>
                    <TableCell>{formatCurrency(opp.loan_amount)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          opp.status
                        )}`}
                      >
                        {formatStatus(opp.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
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
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    }>
      <OpportunitiesContent />
    </Suspense>
  );
}
