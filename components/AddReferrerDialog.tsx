'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete } from '@/components/address-autocomplete';

interface AddReferrerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReferrerAdded: () => void;
}

export function AddReferrerDialog({ open, onOpenChange, onReferrerAdded }: AddReferrerDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    directorFirstName: '',
    directorSurname: '',
    contactPhone: '',
    contactEmail: '',
    abn: '',
    companyName: '',
    tradingName: '',
    companyAddress: '',
    numberOfAdditionalDirectors: 'None',
    additionalDirectors: [] as { firstName: string; surname: string }[],
    entity: '',
    industryType: '',
    password: '',
    confirmPassword: '',
  });

  // Password validation state
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const validatePassword = (password: string) => {
    setPasswordStrength({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    });
  };


  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'password' && typeof value === 'string') {
      validatePassword(value);
    }

    if (field === 'numberOfAdditionalDirectors' && typeof value === 'string') {
      const count = value === 'None' ? 0 : parseInt(value);
      const newDirectors: { firstName: string; surname: string }[] = [];
      for (let i = 0; i < count; i++) {
        newDirectors.push({
          firstName: formData.additionalDirectors[i]?.firstName || '',
          surname: formData.additionalDirectors[i]?.surname || ''
        });
      }
      setFormData(prev => ({ ...prev, additionalDirectors: newDirectors }));
    }
  };

  const handleAdditionalDirectorChange = (index: number, field: 'firstName' | 'surname', value: string) => {
    setFormData(prev => {
      const newDirectors = [...prev.additionalDirectors];
      newDirectors[index] = { ...newDirectors[index], [field]: value };
      return { ...prev, additionalDirectors: newDirectors };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.directorFirstName || !formData.directorSurname) {
      setError('Please enter director name');
      return;
    }

    if (!formData.contactPhone || !formData.contactEmail) {
      setError('Please enter contact details');
      return;
    }

    if (!formData.companyName) {
      setError('Please select or enter a company name');
      return;
    }

    if (!formData.companyAddress) {
      setError('Please enter company address');
      return;
    }

    if (!formData.entity) {
      setError('Please select an entity type');
      return;
    }

    if (!formData.industryType) {
      setError('Please select your industry type');
      return;
    }

    if (formData.additionalDirectors.length > 0) {
      for (let i = 0; i < formData.additionalDirectors.length; i++) {
        const director = formData.additionalDirectors[i];
        if (!director.firstName || !director.surname) {
          setError(`Please enter full name for additional director ${i + 1}`);
          return;
        }
      }
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const allPasswordRequirementsMet =
      passwordStrength.minLength &&
      passwordStrength.hasUpperCase &&
      passwordStrength.hasLowerCase &&
      passwordStrength.hasNumber &&
      passwordStrength.hasSpecialChar;

    if (!allPasswordRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/referrers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create referrer. Please try again.');
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Success',
        description: 'Referrer created successfully',
      });

      // Reset form
      setFormData({
        directorFirstName: '',
        directorSurname: '',
        contactPhone: '',
        contactEmail: '',
        abn: '',
        companyName: '',
        tradingName: '',
        companyAddress: '',
        numberOfAdditionalDirectors: 'None',
        additionalDirectors: [],
        entity: '',
        industryType: '',
        password: '',
        confirmPassword: '',
      });

      onReferrerAdded();
      onOpenChange(false);
    } catch (err) {
      console.error('Create referrer error:', err);
      setError('Failed to create referrer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Referrer</DialogTitle>
          <DialogDescription>
            Create a new referrer organization with an admin user account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Director Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Director Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Director First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="First Name"
                    value={formData.directorFirstName}
                    onChange={(e) => handleInputChange('directorFirstName', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">Director Surname *</Label>
                  <Input
                    id="surname"
                    placeholder="Surname"
                    value={formData.directorSurname}
                    onChange={(e) => handleInputChange('directorSurname', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN / GST No.</Label>
                  <Input
                    id="abn"
                    placeholder="ABN / GST No."
                    value={formData.abn}
                    onChange={(e) => handleInputChange('abn', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradingName">Trading Name</Label>
                <Input
                  id="tradingName"
                  placeholder="Trading Name"
                  value={formData.tradingName}
                  onChange={(e) => handleInputChange('tradingName', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Company Address *</Label>
                <AddressAutocomplete
                  value={formData.companyAddress}
                  onChange={(value) => setFormData(prev => ({ ...prev, companyAddress: value }))}
                  placeholder="Start typing address or enter manually"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="additionalDirectors">Number of Additional Directors</Label>
                  <Select
                    value={formData.numberOfAdditionalDirectors}
                    onValueChange={(value) => handleInputChange('numberOfAdditionalDirectors', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entity">Entity *</Label>
                  <Select
                    value={formData.entity}
                    onValueChange={(value) => handleInputChange('entity', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private_company">Private company</SelectItem>
                      <SelectItem value="sole_trader">Sole trader</SelectItem>
                      <SelectItem value="smsf_trust">SMSF Trust</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.additionalDirectors.length > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <Label>Director Names:</Label>
                  {formData.additionalDirectors.map((director, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold">
                        {index + 1}
                      </div>
                      <Input
                        placeholder="First Name"
                        value={director.firstName}
                        onChange={(e) => handleAdditionalDirectorChange(index, 'firstName', e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Surname"
                        value={director.surname}
                        onChange={(e) => handleAdditionalDirectorChange(index, 'surname', e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="industryType">Industry Type *</Label>
                <Select
                  value={formData.industryType}
                  onValueChange={(value) => handleInputChange('industryType', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="buyers_advocate">Buyers&apos; Advocate</SelectItem>
                    <SelectItem value="conveyancer">Conveyancer</SelectItem>
                    <SelectItem value="financial_adviser">Financial Adviser</SelectItem>
                    <SelectItem value="lawyer">Lawyer</SelectItem>
                    <SelectItem value="mortgage_broker">Mortgage Broker</SelectItem>
                    <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Account Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Security</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {formData.password && (
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.hasUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.hasLowerCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One number</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One special character</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      Passwords do not match
                    </p>
                  )}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Referrer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
