'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Helper to allow only numbers (and optionally decimal point)
const handleNumericInput = (value: string): string => {
  // Remove any non-numeric characters except decimal point
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
};

interface FundingRequirementsData {
  loanAmount: string;
  estimatedPropertyValue: string;
  assetType: string;
  assetAddress: string;
  loanType: string;
  loanPurpose: string;
  fundedFromRental: string;
  proposedRentalIncome: string;
  netProfitBeforeTax: string;
  amortisation: string;
  depreciation: string;
  existingInterestCosts: string;
  rentalExpense: string;
}

interface ClientFundingRequirementsProps {
  data: FundingRequirementsData;
  onChange: (field: keyof FundingRequirementsData, value: string) => void;
  showFinancialDetails?: boolean;
  isExpanded?: boolean;
  showLoanDetails?: boolean; // Controls display of asset type, address, loan type, and loan purpose
}

export function ClientFundingRequirements({
  data,
  onChange,
  showFinancialDetails = true,
  isExpanded = true,
  showLoanDetails = true,
}: ClientFundingRequirementsProps) {
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
        <h3 className="text-lg font-semibold text-gray-900">
          Your Client&apos;s Funding Requirements
        </h3>
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
        <div className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanAmount">
                Loan Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="loanAmount"
                placeholder="Loan Amount"
                value={data.loanAmount}
                onChange={(e) => onChange('loanAmount', handleNumericInput(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedPropertyValue">
                Estimated property value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="estimatedPropertyValue"
                placeholder="Estimated property value"
                value={data.estimatedPropertyValue}
                onChange={(e) => onChange('estimatedPropertyValue', handleNumericInput(e.target.value))}
                inputMode="numeric"
              />
            </div>
          </div>

          {showLoanDetails && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assetType">Type of Asset</Label>
                  <Select
                    value={data.assetType}
                    onValueChange={(value) => onChange('assetType', value)}
                  >
                    <SelectTrigger id="assetType">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial_property">Commercial Property</SelectItem>
                      <SelectItem value="residential_property">Residential Property</SelectItem>
                      <SelectItem value="vacant_land">Vacant Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assetAddress">Asset Address</Label>
                  <Input
                    id="assetAddress"
                    placeholder="Asset Address"
                    value={data.assetAddress}
                    onChange={(e) => onChange('assetAddress', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanType">
                  Loan Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.loanType}
                  onValueChange={(value) => onChange('loanType', value)}
                >
                  <SelectTrigger id="loanType">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="lease_doc">Lease Doc</SelectItem>
                    <SelectItem value="low_doc">Low Doc</SelectItem>
                    <SelectItem value="private_short_term">Private / Short Term</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Loan Purpose</Label>
                <RadioGroup
                  value={data.loanPurpose}
                  onValueChange={(value) => onChange('loanPurpose', value)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="purchase_owner_occupier" id="purchase_owner_occupier" />
                      <Label htmlFor="purchase_owner_occupier" className="cursor-pointer font-normal">
                        Purchase - Owner Occupier
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="purchase_investment" id="purchase_investment" />
                      <Label htmlFor="purchase_investment" className="cursor-pointer font-normal">
                        Purchase - Investment
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="refinance" id="refinance" />
                      <Label htmlFor="refinance" className="cursor-pointer font-normal">
                        Refinance
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="equity_release" id="equity_release" />
                      <Label htmlFor="equity_release" className="cursor-pointer font-normal">
                        Equity Release
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="land_bank" id="land_bank" />
                      <Label htmlFor="land_bank" className="cursor-pointer font-normal">
                        Land Bank
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="business_use" id="business_use" />
                      <Label htmlFor="business_use" className="cursor-pointer font-normal">
                        Business Use
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="commercial_equipment" id="commercial_equipment" />
                  <Label htmlFor="commercial_equipment" className="cursor-pointer font-normal">
                    Commercial Equipment
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
            </>
          )}

          {/* Financial Details - Conditional */}
          {showFinancialDetails && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Funding</Label>
                <p className="text-sm text-muted-foreground">
                  Will the property be funded solely from rental income?
                </p>
                <RadioGroup
                  value={data.fundedFromRental}
                  onValueChange={(value) => onChange('fundedFromRental', value)}
                  className="flex gap-8"
                >
                  <label
                    htmlFor="funded-yes"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem value="yes" id="funded-yes" />
                    <span className="font-normal text-sm">Yes</span>
                  </label>
                  <label
                    htmlFor="funded-no"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem value="no" id="funded-no" />
                    <span className="font-normal text-sm">No</span>
                  </label>
                </RadioGroup>

                {/* Conditional fields based on rental income answer */}
                {data.fundedFromRental === 'yes' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proposedRentalIncome">
                        Proposed Rental Income (Annual)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="proposedRentalIncome"
                          type="text"
                          className="pl-7"
                          value={data.proposedRentalIncome}
                          onChange={(e) => onChange('proposedRentalIncome', handleNumericInput(e.target.value))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {data.fundedFromRental === 'no' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="netProfitBeforeTax">Net Profit Before Tax</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="netProfitBeforeTax"
                          type="text"
                          className="pl-7"
                          value={data.netProfitBeforeTax}
                          onChange={(e) => onChange('netProfitBeforeTax', handleNumericInput(e.target.value))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">Addbacks</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amortisation">Amortisation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            id="amortisation"
                            type="text"
                            className="pl-7"
                            value={data.amortisation}
                            onChange={(e) => onChange('amortisation', handleNumericInput(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="depreciation">Depreciation</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            id="depreciation"
                            type="text"
                            className="pl-7"
                            value={data.depreciation}
                            onChange={(e) => onChange('depreciation', handleNumericInput(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="existingInterestCosts">Existing Interest Costs</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            id="existingInterestCosts"
                            type="text"
                            className="pl-7"
                            value={data.existingInterestCosts}
                            onChange={(e) => onChange('existingInterestCosts', handleNumericInput(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rentalExpense">Rental Expense</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            id="rentalExpense"
                            type="text"
                            className="pl-7"
                            value={data.rentalExpense}
                            onChange={(e) => onChange('rentalExpense', handleNumericInput(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proposedRentalIncomeNo">
                        Proposed Rental Income (Annual)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="proposedRentalIncomeNo"
                          type="text"
                          className="pl-7"
                          value={data.proposedRentalIncome}
                          onChange={(e) => onChange('proposedRentalIncome', handleNumericInput(e.target.value))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
