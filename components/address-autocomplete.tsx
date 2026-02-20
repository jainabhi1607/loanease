'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Common countries list
const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'SG', label: 'Singapore' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PH', label: 'Philippines' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'KR', label: 'South Korea' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'OTHER', label: 'Other' },
];

export interface AddressData {
  fullAddress: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  country?: string;
}

interface AddressFieldsProps {
  value: string;
  onChange: (value: string, addressData?: AddressData) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  // Individual field values for controlled input
  streetAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  onFieldChange?: (field: string, value: string) => void;
}

// Keep the old interface name for backward compatibility
export function AddressAutocomplete({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  streetAddress = '',
  suburb = '',
  state = '',
  postcode = '',
  country = 'IN',
  onFieldChange
}: AddressFieldsProps) {

  const handleFieldChange = (field: string, fieldValue: string) => {
    // If onFieldChange is provided, use it (for forms that manage fields separately)
    if (onFieldChange) {
      onFieldChange(field, fieldValue);
      return;
    }

    // Otherwise, build full address and call onChange
    const updated = {
      streetAddress: field === 'streetAddress' ? fieldValue : streetAddress,
      suburb: field === 'suburb' ? fieldValue : suburb,
      state: field === 'state' ? fieldValue : state,
      postcode: field === 'postcode' ? fieldValue : postcode,
      country: field === 'country' ? fieldValue : country,
    };

    // Build full address string
    const countryLabel = COUNTRIES.find(c => c.value === updated.country)?.label || updated.country;
    const parts = [
      updated.streetAddress,
      updated.suburb,
      updated.state,
      updated.postcode,
      countryLabel
    ].filter(Boolean);

    const fullAddress = parts.join(', ');

    // Create address data object
    const addressData: AddressData = {
      fullAddress,
      streetAddress: updated.streetAddress,
      suburb: updated.suburb,
      state: updated.state,
      postcode: updated.postcode,
      country: updated.country,
    };

    onChange(fullAddress, addressData);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="streetAddress">Street Address</Label>
        <Input
          id="streetAddress"
          type="text"
          value={streetAddress}
          onChange={(e) => handleFieldChange('streetAddress', e.target.value)}
          placeholder="Street Address"
          required={required}
          disabled={disabled}
          className={className}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suburb">City/Town</Label>
          <Input
            id="suburb"
            type="text"
            value={suburb}
            onChange={(e) => handleFieldChange('suburb', e.target.value)}
            placeholder="City/Town"
            disabled={disabled}
            className={className}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            type="text"
            value={state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            placeholder="State/Province"
            disabled={disabled}
            className={className}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            type="text"
            value={postcode}
            onChange={(e) => handleFieldChange('postcode', e.target.value)}
            placeholder="Postcode"
            disabled={disabled}
            className={className}
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select
            value={country}
            onValueChange={(val) => handleFieldChange('country', val)}
            disabled={disabled}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Also export as ManualAddressFields for clarity
export const ManualAddressFields = AddressAutocomplete;
