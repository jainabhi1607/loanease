'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LoanDeclinedReason {
  id: string;
  reason: string;
}

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Opportunity Alert Email
  const [opportunityEmails, setOpportunityEmails] = useState('');

  // New Referrer Alert
  const [referrerEmails, setReferrerEmails] = useState('');

  // Loan Declined Reasons
  const [declinedReasons, setDeclinedReasons] = useState<LoanDeclinedReason[]>([]);
  const [editingReason, setEditingReason] = useState<LoanDeclinedReason | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newReason, setNewReason] = useState('');

  // Interest Rate
  const [interestRate, setInterestRate] = useState('8.5');

  // Commission Split
  const [commissionSplit, setCommissionSplit] = useState('');

  // Load settings from database
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      const settings = data.settings;

      setOpportunityEmails(settings.opportunity_alert_emails || '');
      setReferrerEmails(settings.new_referrer_alert_emails || '');
      setInterestRate(settings.default_interest_rate || '8.5');
      setCommissionSplit(settings.commission_split || '');

      // Load loan declined reasons
      if (settings.loan_declined_reasons && Array.isArray(settings.loan_declined_reasons)) {
        const reasons = settings.loan_declined_reasons.map((reason: string, index: number) => ({
          id: (index + 1).toString(),
          reason,
        }));
        setDeclinedReasons(reasons);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value }),
      });

      if (!response.ok) throw new Error('Failed to save setting');
      return true;
    } catch (error) {
      console.error('Error saving setting:', error);
      throw error;
    }
  };

  const handleSaveOpportunityEmails = async () => {
    setLoading(true);
    try {
      await saveSetting('opportunity_alert_emails', opportunityEmails);
      toast({
        title: 'Success',
        description: 'Opportunity alert emails saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save opportunity alert emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReferrerEmails = async () => {
    setLoading(true);
    try {
      await saveSetting('new_referrer_alert_emails', referrerEmails);
      toast({
        title: 'Success',
        description: 'New referrer alert emails saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save referrer alert emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDeclinedReasons = async (reasons: LoanDeclinedReason[]) => {
    const reasonsArray = reasons.map(r => r.reason);
    await saveSetting('loan_declined_reasons', reasonsArray);
  };

  const handleAddReason = async () => {
    if (!newReason.trim()) return;

    const newReasonObj: LoanDeclinedReason = {
      id: Date.now().toString(),
      reason: newReason,
    };

    const updatedReasons = [...declinedReasons, newReasonObj];
    setDeclinedReasons(updatedReasons);
    setNewReason('');

    try {
      await saveDeclinedReasons(updatedReasons);
      toast({
        title: 'Success',
        description: 'Reason added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save reason',
        variant: 'destructive',
      });
    }
  };

  const handleEditReason = (reason: LoanDeclinedReason) => {
    setEditingReason({ ...reason });
    setEditDialogOpen(true);
  };

  const handleSaveEditedReason = async () => {
    if (!editingReason) return;

    const updatedReasons = declinedReasons.map(r =>
      r.id === editingReason.id ? editingReason : r
    );
    setDeclinedReasons(updatedReasons);
    setEditDialogOpen(false);
    setEditingReason(null);

    try {
      await saveDeclinedReasons(updatedReasons);
      toast({
        title: 'Success',
        description: 'Reason updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reason',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReason = async (id: string) => {
    const updatedReasons = declinedReasons.filter(r => r.id !== id);
    setDeclinedReasons(updatedReasons);

    try {
      await saveDeclinedReasons(updatedReasons);
      toast({
        title: 'Success',
        description: 'Reason deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete reason',
        variant: 'destructive',
      });
    }
  };

  const handleSaveInterestRate = async () => {
    setLoading(true);
    try {
      await saveSetting('default_interest_rate', interestRate);
      toast({
        title: 'Success',
        description: 'Interest rate saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save interest rate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommissionSplit = async () => {
    setLoading(true);
    try {
      await saveSetting('commission_split', commissionSplit);
      toast({
        title: 'Success',
        description: 'Commission split saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save commission split',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/admin/settings">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Opportunity Alert Email */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Opportunity Alert Email</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add a new email address to each line for all recipients of the Opportunity Alert.
            </p>
            <Textarea
              value={opportunityEmails}
              onChange={(e) => setOpportunityEmails(e.target.value)}
              placeholder="Enter email addresses (one per line)"
              className="mb-4 h-24"
            />
            <Button
              onClick={handleSaveOpportunityEmails}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </div>

          {/* New Referrer Alert */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">New Referrer Alert</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add a new email address to each line for all recipients of the New Referrer Alert.
            </p>
            <Textarea
              value={referrerEmails}
              onChange={(e) => setReferrerEmails(e.target.value)}
              placeholder="Enter email addresses (one per line)"
              className="mb-4 h-24"
            />
            <Button
              onClick={handleSaveReferrerEmails}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </div>

          {/* Loan Declined */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan Declined</h3>
            <p className="text-sm text-gray-500 mb-4">Manage Loan Declined</p>

            <Button
              onClick={() => {
                setNewReason('');
                document.getElementById('new-reason-input')?.focus();
              }}
              variant="outline"
              className="mb-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reason
            </Button>

            <div className="mb-4">
              <Label className="text-base font-medium mb-3 block">Reasons:</Label>
              <div className="space-y-2">
                {declinedReasons.map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{reason.reason}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditReason(reason)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteReason(reason.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                id="new-reason-input"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Enter new reason..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddReason();
                  }
                }}
              />
              <Button
                onClick={handleAddReason}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Interest Rate</h3>
            <p className="text-sm text-gray-500 mb-4">Add Interest Rate.</p>
            <Input
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="mb-4 max-w-xs"
            />
            <Button
              onClick={handleSaveInterestRate}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </div>

          {/* Commission Split */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Commission Split</h3>
            <p className="text-sm text-gray-500 mb-4">Add Commission Split.</p>
            <Textarea
              value={commissionSplit}
              onChange={(e) => setCommissionSplit(e.target.value)}
              className="mb-4 h-32"
            />
            <Button
              onClick={handleSaveCommissionSplit}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Reason Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reason</DialogTitle>
            <DialogDescription>
              Update the loan declined reason below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editingReason?.reason || ''}
              onChange={(e) =>
                setEditingReason(
                  editingReason ? { ...editingReason, reason: e.target.value } : null
                )
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedReason}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
