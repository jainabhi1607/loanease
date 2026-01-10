'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface OtherQuestionsData {
  existingLiabilities: string;
  additionalSecurity: string;
  smsf: string;
  existingATO: string;
  creditIssues: string;
}

interface OtherQuestionsProps {
  data: OtherQuestionsData;
  onChange: (field: keyof OtherQuestionsData, value: string) => void;
  isExpanded?: boolean;
}

export function OtherQuestions({
  data,
  onChange,
  isExpanded = true,
}: OtherQuestionsProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="border rounded-lg">
      {/* Header with toggle */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={toggleExpanded}
      >
        <h3 className="text-lg font-semibold text-gray-900">Other Questions</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4 bg-[#f0fdf4] mx-4 mb-4 rounded-lg">
          <div className="pt-4">
            <p className="text-sm mb-2">
              Does your business and/or the borrowing entity have any existing liabilities
            </p>
            <RadioGroup
              value={data.existingLiabilities}
              onValueChange={(value) => onChange('existingLiabilities', value)}
              className="flex gap-8"
            >
              <label
                htmlFor="liabilities-yes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="yes" id="liabilities-yes" />
                <span className="font-semibold text-sm text-gray-900">Yes</span>
              </label>
              <label
                htmlFor="liabilities-no"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="no" id="liabilities-no" />
                <span className="font-semibold text-sm text-gray-900">No</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <p className="text-sm mb-2">
              Are you looking to offer up additional property security to support your equity position?
            </p>
            <RadioGroup
              value={data.additionalSecurity}
              onValueChange={(value) => onChange('additionalSecurity', value)}
              className="flex gap-8"
            >
              <label
                htmlFor="security-yes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="yes" id="security-yes" />
                <span className="font-semibold text-sm text-gray-900">Yes</span>
              </label>
              <label
                htmlFor="security-no"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="no" id="security-no" />
                <span className="font-semibold text-sm text-gray-900">No</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <p className="text-sm mb-2">Is the application an SMSF structure?</p>
            <RadioGroup
              value={data.smsf}
              onValueChange={(value) => onChange('smsf', value)}
              className="flex gap-8"
            >
              <label
                htmlFor="smsf-yes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="yes" id="smsf-yes" />
                <span className="font-semibold text-sm text-gray-900">Yes</span>
              </label>
              <label
                htmlFor="smsf-no"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="no" id="smsf-no" />
                <span className="font-semibold text-sm text-gray-900">No</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <p className="text-sm mb-2">
              Do you have any existing or overdue ATO / tax liabilities?
            </p>
            <RadioGroup
              value={data.existingATO}
              onValueChange={(value) => onChange('existingATO', value)}
              className="flex gap-8"
            >
              <label
                htmlFor="ato-yes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="yes" id="ato-yes" />
                <span className="font-semibold text-sm text-gray-900">Yes</span>
              </label>
              <label
                htmlFor="ato-no"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="no" id="ato-no" />
                <span className="font-semibold text-sm text-gray-900">No</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <p className="text-sm mb-2">
              Do you have any credit file issues e.g. paid or unpaid defaults?
            </p>
            <RadioGroup
              value={data.creditIssues}
              onValueChange={(value) => onChange('creditIssues', value)}
              className="flex gap-8"
            >
              <label
                htmlFor="credit-yes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="yes" id="credit-yes" />
                <span className="font-semibold text-sm text-gray-900">Yes</span>
              </label>
              <label
                htmlFor="credit-no"
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value="no" id="credit-no" />
                <span className="font-semibold text-sm text-gray-900">No</span>
              </label>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  );
}
