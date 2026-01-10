'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useToast } from '@/hooks/use-toast';

export default function TermsAndConditionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [termsContent, setTermsContent] = useState('');
  const [referrerFees, setReferrerFees] = useState('');

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

      setTermsContent(settings.terms_and_conditions || '');
      setReferrerFees(settings.referrer_fees || '');
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

  const handleSaveTerms = async () => {
    setLoading(true);
    try {
      await saveSetting('terms_and_conditions', termsContent);
      toast({
        title: 'Success',
        description: 'Terms & Conditions saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save terms & conditions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReferrerFees = async () => {
    setLoading(true);
    try {
      await saveSetting('referrer_fees', referrerFees);
      toast({
        title: 'Success',
        description: 'Referrer fees saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save referrer fees',
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
          {/* Terms & Conditions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
            <p className="text-sm text-gray-500 mb-4">Add Terms & Conditions with rich text formatting.</p>
            <RichTextEditor
              value={termsContent}
              onChange={setTermsContent}
              placeholder="Enter terms and conditions..."
              minHeight="300px"
            />
            <div className="mt-4">
              <Button
                onClick={handleSaveTerms}
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Referrer Fees */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Referrer Fees</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add the referrer fees you wish to display in the referrer aggrement.
            </p>
            <p className="text-sm text-gray-500 mb-4">This will apply to all referrers.</p>
            <Textarea
              value={referrerFees}
              onChange={(e) => setReferrerFees(e.target.value)}
              className="mb-4 h-32"
            />
            <Button
              onClick={handleSaveReferrerFees}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
