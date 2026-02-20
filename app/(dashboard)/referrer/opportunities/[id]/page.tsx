'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Circle, Edit, MoreVertical, Eye, Clock } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OpportunityClientDetails } from '@/components/opportunity/OpportunityClientDetails';
import { OpportunityLoanDetails } from '@/components/opportunity/OpportunityLoanDetails';
import { OpportunityFinancialDetails } from '@/components/opportunity/OpportunityFinancialDetails';
import { OpportunitySidebar } from '@/components/opportunity/OpportunitySidebar';
import {
  formatCurrency,
  formatDate,
  formatEntityType,
  formatAssetType,
  formatIndustry,
  formatLoanType,
  formatLoanPurpose,
  formatStatusDisplay,
  getStatusColor
} from '@/lib/opportunity-utils';

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  is_public: boolean;
}

interface ReferrerUser {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  role: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  action: string;
  field_name: string | null;
  old_value: any;
  new_value: any;
  description: string;
  user_name: string;
  ip_address: string;
}

export default function ReferrerOpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // External Ref editing
  const [externalRefDialogOpen, setExternalRefDialogOpen] = useState(false);
  const [externalRef, setExternalRef] = useState('');

  // Edit Referrer Details (Team Member)
  const [referrerDetailsDialogOpen, setReferrerDetailsDialogOpen] = useState(false);
  const [referrerUsers, setReferrerUsers] = useState<ReferrerUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOpportunityDetails();
      fetchNotes();
    }
  }, [params.id]);

  // Fetch history when tab changes to history
  useEffect(() => {
    if (activeTab === 'history' && params.id && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab, params.id]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}/history`);
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load history',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch referrer users when dialog opens
  useEffect(() => {
    if (referrerDetailsDialogOpen && referrerUsers.length === 0) {
      fetchReferrerUsers();
    }
  }, [referrerDetailsDialogOpen]);

  const fetchReferrerUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/referrer/users');
      const data = await response.json();

      if (response.ok) {
        setReferrerUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching referrer users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchOpportunityDetails = async () => {
    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setOpportunity(data);
        setExternalRef(data.external_ref || '');
        setSelectedUserId(data.created_by || '');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load opportunity details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load opportunity details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Note added successfully' });
        setNewNote('');
        fetchNotes();
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add note', variant: 'destructive' });
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !editNoteContent.trim()) return;

    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editNoteContent.trim() }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Note updated successfully' });
        setEditingNote(null);
        setEditNoteContent('');
        fetchNotes();
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update note', variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Note deleted successfully' });
        setDeleteNoteId(null);
        fetchNotes();
      } else {
        throw new Error('Failed to delete note');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    }
  };

  const handleSaveExternalRef = async () => {
    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_ref: externalRef }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'External reference updated' });
        setExternalRefDialogOpen(false);
        fetchOpportunityDetails();
      } else {
        throw new Error('Failed to update external reference');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update external reference', variant: 'destructive' });
    }
  };

  const handleSaveReferrerDetails = async () => {
    if (!selectedUserId) {
      toast({ title: 'Error', description: 'Please select a team member', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/referrer/opportunities/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: selectedUserId }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Team member updated' });
        setReferrerDetailsDialogOpen(false);
        fetchOpportunityDetails();
      } else {
        throw new Error('Failed to update team member');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update team member', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-[#787274]">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-[#787274]">Opportunity not found</p>
        </div>
      </div>
    );
  }

  // Check if opportunity is unqualified - disable editing if so
  const isUnqualified = opportunity.is_unqualified === 1;

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(isUnqualified ? '/referrer/opportunities/unqualified' : '/referrer/opportunities')}
          className="mb-4 text-[#787274] hover:text-[#02383B]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Circle className="h-8 w-8 text-gray-400" />
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#02383B]">{opportunity.opportunity_id}</h1>
                <span className="text-sm text-[#787274]">{opportunity.client_entity_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {opportunity.status === 'draft' && (
                <Button
                  onClick={() => router.push(`/referrer/opportunities/${params.id}/edit`)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Draft
                </Button>
              )}
              <Badge className={getStatusColor(opportunity.status)}>
                {formatStatusDisplay(opportunity.status)}
              </Badge>
            </div>
          </div>

          {/* External Ref, Referrer Group, Team Member Row */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#787274]">External Ref:</span>
              {opportunity.external_ref ? (
                <span className="text-sm font-medium">{opportunity.external_ref}</span>
              ) : (
                <span className="text-sm text-gray-400">-</span>
              )}
              {!isUnqualified && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExternalRefDialogOpen(true)}
                  className="h-6 px-2 text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {opportunity.external_ref ? 'Edit' : 'Add External Ref'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#787274]">Referrer Group:</span>
              <span className="text-sm font-medium">{opportunity.referrer_group || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#787274]">Team Member:</span>
              <span className="text-sm font-medium">{opportunity.created_by_name || '-'}</span>
              {!isUnqualified && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReferrerDetailsDialogOpen(true)}
                  className="h-6 px-2 text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 border-b">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-[#787274] hover:text-[#02383B]'
                }`}
              >
                <Eye className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-[#787274] hover:text-[#02383B]'
                }`}
              >
                <Clock className="h-4 w-4" />
                History
              </button>
            </div>
          </div>

          {/* History Tab Content */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-6">Activity History</h3>
              {historyLoading ? (
                <div className="text-center py-8 text-[#787274]">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-[#787274]">No history records found</div>
              ) : (
                <div className="space-y-0">
                  {history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-6 py-4 ${
                        index !== history.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="w-32 shrink-0">
                        <p className="font-semibold text-[#02383B]">
                          {new Date(entry.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-[#787274]">{entry.time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#02383B]">
                          {entry.description}
                          <span className="text-[#787274]"> by </span>
                          <span className="font-medium">{entry.user_name}</span>
                        </p>
                      </div>
                      <div className="w-32 shrink-0 text-right">
                        <p className="text-sm text-[#787274]">{entry.ip_address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
          <>
          <OpportunityClientDetails
            opportunity={opportunity}
            formatEntityType={formatEntityType}
            formatIndustry={formatIndustry}
            canEdit={false}
            clientViewUrl={opportunity.client_id ? `/referrer/clients/${opportunity.client_id}` : undefined}
          />

          <OpportunityLoanDetails
            opportunity={opportunity}
            formatCurrency={formatCurrency}
            formatAssetType={formatAssetType}
            formatLoanType={formatLoanType}
            formatLoanPurpose={formatLoanPurpose}
            canEdit={false}
          />

          <OpportunityFinancialDetails
            opportunity={opportunity}
            formatCurrency={formatCurrency}
            canEdit={false}
          />

          {/* Opportunity Notes */}
          <div className="bg-[#EDFFD7] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#02383B]">Opportunity Notes</h3>
            <p className="text-sm text-[#787274] mt-1 mb-4">
              Please add any notes you feel relevant for the Loanease team regarding this Opportunity
            </p>

            {/* Add New Note */}
            <div className="mb-6">
              <Textarea
                placeholder="Start typing..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mb-3 bg-white border-0 rounded-lg"
                rows={4}
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="bg-[#00D37F] hover:bg-[#00b86e] text-white"
              >
                Save
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="pb-4 border-b border-[#00D37F]/20 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#02383B]">{note.created_by_name}</p>
                      <p className="text-sm text-[#787274]">
                        {formatDate(note.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap text-[#00D37F] mt-1">{note.content}</p>
                    </div>
                    {!isUnqualified && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingNote(note);
                            setEditNoteContent(note.content);
                          }}
                          className="text-gray-400 hover:text-[#02383B] transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteNoteId(note.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Unqualified Opportunity Banner */}
          {isUnqualified && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3 text-orange-600">Unqualified Opportunity</h3>
              <p className="text-orange-700 whitespace-pre-wrap">{opportunity.unqualified_reason || 'No reason provided'}</p>
            </div>
          )}

          <OpportunitySidebar
            opportunity={opportunity}
            formatDate={formatDate}
            canEditDates={false}
            isUnqualified={isUnqualified}
          />
        </div>
      </div>

      {/* Edit Referrer Details Dialog */}
      <Dialog open={referrerDetailsDialogOpen} onOpenChange={setReferrerDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-teal-800">Edit Referrer Details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4">
              <Label className="w-40 text-sm">Select Referrer User</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isLoadingUsers}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {referrerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferrerDetailsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReferrerDetails} className="bg-teal-700 hover:bg-teal-800">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit External Ref Dialog */}
      <Dialog open={externalRefDialogOpen} onOpenChange={setExternalRefDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit External Reference</DialogTitle>
            <DialogDescription>
              Add or update the external reference for this opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="Enter external reference"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalRefDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveExternalRef}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={editingNote !== null} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editNoteContent}
              onChange={(e) => setEditNoteContent(e.target.value)}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Dialog */}
      <Dialog open={deleteNoteId !== null} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNoteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
