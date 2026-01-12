'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import Link from 'next/link';

interface OpportunityClientDetailsProps {
  opportunity: any;
  formatEntityType: (type?: string) => string;
  formatIndustry: (industry?: string) => string;
  canEdit?: boolean;
  onEdit?: () => void;
  clientViewUrl?: string;
}

export function OpportunityClientDetails({
  opportunity,
  formatEntityType,
  formatIndustry,
  canEdit = false,
  onEdit,
  clientViewUrl
}: OpportunityClientDetailsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Client Details</CardTitle>
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Edit client details"
          >
            <Pencil className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Borrowing Entity Type</p>
            <p className="font-medium">{formatEntityType(opportunity.client_entity_type)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Borrowing Entity Name</p>
            {clientViewUrl && opportunity.client_entity_name ? (
              <Link href={clientViewUrl} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                {opportunity.client_entity_name}
              </Link>
            ) : (
              <p className="font-medium">{opportunity.client_entity_name || '-'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Borrower Contact</p>
            <p className="font-medium">{opportunity.client_contact_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Mobile</p>
            <p className="font-medium">{opportunity.client_mobile || '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{opportunity.client_email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Company Address</p>
            <p className="font-medium">{opportunity.client_address || '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">ABN / GST No.</p>
            <p className="font-medium">{opportunity.client_abn || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time in business</p>
            <p className="font-medium">{opportunity.client_time_in_business || '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Industry</p>
            <p className="font-medium">{formatIndustry(opportunity.client_industry)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">Brief Overview</p>
          <p className="font-medium whitespace-pre-wrap">{opportunity.client_brief_overview || '-'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
