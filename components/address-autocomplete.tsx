'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, X } from 'lucide-react';

// Australian states
const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export interface AddressData {
  fullAddress: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, addressData?: AddressData) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

interface Suggestion {
  place_name: string;
  text: string;
  address?: string;
  context?: MapboxContext[];
  properties?: {
    address?: string;
  };
}

// Parse Mapbox response to extract address components
function parseMapboxAddress(suggestion: Suggestion): AddressData {
  const context = suggestion.context || [];

  // Extract components from context
  let suburb = '';
  let state = '';
  let postcode = '';

  for (const ctx of context) {
    if (ctx.id.startsWith('place.') || ctx.id.startsWith('locality.')) {
      suburb = ctx.text;
    } else if (ctx.id.startsWith('region.')) {
      // Mapbox returns state short code like "au-nsw"
      if (ctx.short_code) {
        const stateCode = ctx.short_code.replace('AU-', '').replace('au-', '').toUpperCase();
        state = stateCode;
      } else {
        // Try to match state name
        const stateName = ctx.text.toLowerCase();
        const matchedState = AUSTRALIAN_STATES.find(s =>
          s.label.toLowerCase() === stateName || s.value.toLowerCase() === stateName
        );
        state = matchedState?.value || ctx.text;
      }
    } else if (ctx.id.startsWith('postcode.')) {
      postcode = ctx.text;
    }
  }

  // Street address is the main text plus house number if available
  const streetAddress = suggestion.address
    ? `${suggestion.address} ${suggestion.text}`
    : suggestion.text;

  return {
    fullAddress: suggestion.place_name,
    streetAddress,
    suburb,
    state,
    postcode
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing address...",
  required = false,
  disabled = false,
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Manual entry fields
  const [manualAddress, setManualAddress] = useState({
    streetAddress: '',
    suburb: '',
    state: '',
    postcode: ''
  });

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/address/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        console.error('Address search API error:', response.status);
        throw new Error(`Address search error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('Address search error:', data.error);
        setSuggestions([]);
      } else {
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!showManualEntry) {
      const timeout = setTimeout(() => {
        searchAddress(newValue);
      }, 300);
      setSearchTimeout(timeout);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    const addressData = parseMapboxAddress(suggestion);
    onChange(suggestion.place_name, addressData);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const toggleManualEntry = () => {
    if (!showManualEntry) {
      // Switching to manual entry - clear autocomplete value
      setManualAddress({
        streetAddress: '',
        suburb: '',
        state: '',
        postcode: ''
      });
    }
    setShowManualEntry(!showManualEntry);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleManualFieldChange = (field: keyof typeof manualAddress, fieldValue: string) => {
    const updated = { ...manualAddress, [field]: fieldValue };
    setManualAddress(updated);

    // Build full address string
    const parts = [
      updated.streetAddress,
      updated.suburb,
      updated.state,
      updated.postcode
    ].filter(Boolean);

    const fullAddress = parts.join(', ');

    // Create address data object
    const addressData: AddressData = {
      fullAddress,
      streetAddress: updated.streetAddress,
      suburb: updated.suburb,
      state: updated.state,
      postcode: updated.postcode
    };

    onChange(fullAddress, addressData);
  };

  if (showManualEntry) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={toggleManualEntry}
          className="text-sm text-primary hover:underline"
        >
          Or select Google Address
        </button>

        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            type="text"
            value={manualAddress.streetAddress}
            onChange={(e) => handleManualFieldChange('streetAddress', e.target.value)}
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
              value={manualAddress.suburb}
              onChange={(e) => handleManualFieldChange('suburb', e.target.value)}
              placeholder="City/Town"
              disabled={disabled}
              className={className}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select
              value={manualAddress.state}
              onValueChange={(val) => handleManualFieldChange('state', val)}
              disabled={disabled}
            >
              <SelectTrigger className={className}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {AUSTRALIAN_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-1/2 pr-2 space-y-2">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            type="text"
            value={manualAddress.postcode}
            onChange={(e) => handleManualFieldChange('postcode', e.target.value)}
            placeholder="Postcode"
            disabled={disabled}
            className={className}
            maxLength={4}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${className} pr-10`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-start gap-2"
                onClick={() => selectSuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm">{suggestion.place_name}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No addresses found. Try being more specific or use manual entry.
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleManualEntry}
        className="text-sm text-primary hover:underline"
      >
        Enter address manually
      </button>
    </div>
  );
}
