# Reusable Components Usage Guide

## ClientFundingRequirements Component

This component encapsulates all "Your Client's Funding Requirements" fields with built-in show/hide functionality.

### Features:
- **Collapsible**: Click header to toggle expanded/collapsed state
- **Loan Details**: Loan Amount, Estimated Property Value, Asset Type, Asset Address, Loan Type, Loan Purpose
- **Financial Details** (optional): Conditional fields based on rental income funding question
- **Controlled State**: Parent component manages all field values

### Props:

```typescript
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
  showFinancialDetails?: boolean; // Default: true
  isExpanded?: boolean; // Default: true
}
```

### Usage Example:

```tsx
import { ClientFundingRequirements } from '@/components/ClientFundingRequirements';

export default function AddOpportunityPage() {
  const [fundingData, setFundingData] = useState({
    loanAmount: '',
    estimatedPropertyValue: '',
    assetType: '',
    assetAddress: '',
    loanType: '',
    loanPurpose: '',
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
  });

  const handleFundingChange = (field: keyof FundingRequirementsData, value: string) => {
    setFundingData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardContent>
        <ClientFundingRequirements
          data={fundingData}
          onChange={handleFundingChange}
          showFinancialDetails={true}
          isExpanded={true}
        />
      </CardContent>
    </Card>
  );
}
```

### Without Financial Details (Pre-Assessment Tool):

```tsx
<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  showFinancialDetails={false}
  isExpanded={true}
/>
```

---

## OtherQuestions Component

This component encapsulates all "Other Questions" fields with built-in show/hide functionality.

### Features:
- **Collapsible**: Click header to toggle expanded/collapsed state
- **5 Yes/No Questions**: Existing liabilities, additional security, SMSF, ATO liabilities, credit issues
- **Controlled State**: Parent component manages all field values

### Props:

```typescript
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
  isExpanded?: boolean; // Default: true
}
```

### Usage Example:

```tsx
import { OtherQuestions } from '@/components/OtherQuestions';

export default function AddOpportunityPage() {
  const [otherQuestionsData, setOtherQuestionsData] = useState({
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
    creditIssues: '',
  });

  const handleOtherQuestionsChange = (field: keyof OtherQuestionsData, value: string) => {
    setOtherQuestionsData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardContent>
        <OtherQuestions
          data={otherQuestionsData}
          onChange={handleOtherQuestionsChange}
          isExpanded={true}
        />
      </CardContent>
    </Card>
  );
}
```

---

## Full Integration Example

Complete page using both components:

```tsx
'use client';

import { useState } from 'react';
import { ClientFundingRequirements } from '@/components/ClientFundingRequirements';
import { OtherQuestions } from '@/components/OtherQuestions';
import { Card, CardContent } from '@/components/ui/card';

export default function OpportunityPage() {
  // Funding Requirements State
  const [fundingData, setFundingData] = useState({
    loanAmount: '',
    estimatedPropertyValue: '',
    assetType: '',
    assetAddress: '',
    loanType: '',
    loanPurpose: '',
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
  });

  // Other Questions State
  const [otherQuestionsData, setOtherQuestionsData] = useState({
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
    creditIssues: '',
  });

  const handleFundingChange = (field, value) => {
    setFundingData(prev => ({ ...prev, [field]: value }));
  };

  const handleOtherQuestionsChange = (field, value) => {
    setOtherQuestionsData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Access all data from both components
    console.log('Funding Data:', fundingData);
    console.log('Other Questions Data:', otherQuestionsData);
  };

  return (
    <div className="space-y-6">
      {/* Client Funding Requirements */}
      <Card>
        <CardContent className="p-6">
          <ClientFundingRequirements
            data={fundingData}
            onChange={handleFundingChange}
            showFinancialDetails={true}
            isExpanded={true}
          />
        </CardContent>
      </Card>

      {/* Other Questions */}
      <Card>
        <CardContent className="p-6">
          <OtherQuestions
            data={otherQuestionsData}
            onChange={handleOtherQuestionsChange}
            isExpanded={true}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit}>
        Submit Opportunity
      </Button>
    </div>
  );
}
```

---

## Benefits

1. **DRY (Don't Repeat Yourself)**: Write once, use in multiple pages
2. **Consistent UI**: Same design across all pages
3. **Single Source of Truth**: Update component once, changes everywhere
4. **Built-in Show/Hide**: Toggle functionality already implemented
5. **Type Safety**: TypeScript interfaces for data and props
6. **Easy Maintenance**: Fix bugs in one place

---

## Where to Use

These components should be used in:

1. **Add Opportunity Page** (`/admin/opportunities/add`)
2. **Edit Opportunity Dialogs** (Any opportunity edit forms)
3. **Pre-Assessment Tool** (`/pre-assessment`) - Use `showFinancialDetails={false}` for simplified version
4. **Referrer Add Opportunity** (When implemented)
5. **Any other forms that collect loan/funding information**

---

## Customization

### Start Collapsed

```tsx
<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  isExpanded={false} // Starts collapsed
/>
```

### Hide Financial Details

```tsx
<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  showFinancialDetails={false} // No funding questions
/>
```

### Programmatic Control

```tsx
const [isExpanded, setIsExpanded] = useState(true);

<ClientFundingRequirements
  data={fundingData}
  onChange={handleFundingChange}
  isExpanded={isExpanded}
/>

<Button onClick={() => setIsExpanded(!isExpanded)}>
  Toggle Section
</Button>
```

---

## Migration Checklist

To migrate existing pages to use these components:

1. ✅ Import the component
2. ✅ Create state object matching the interface
3. ✅ Create onChange handler function
4. ✅ Replace existing form fields with component
5. ✅ Remove old field JSX code
6. ✅ Update form submission to read from state object
7. ✅ Test functionality (expand/collapse, field changes, validation)
8. ✅ Verify styling matches design

---

## Notes

- **Controlled Components**: These are fully controlled - parent manages all state
- **No Internal State**: Field values are NOT stored in the components themselves
- **onChange Callback**: Every field change triggers the onChange callback
- **Validation**: Implement validation in the parent component, not in these components
- **Styling**: Components use Tailwind and shadcn/ui for consistent design
