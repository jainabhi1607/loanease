'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, X, Check, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditReferrerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLookingUpABN, setIsLookingUpABN] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abnStatus, setAbnStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'exists'>('idle');
  const [abnMessage, setAbnMessage] = useState<string>('');
  const [companyNameOptions, setCompanyNameOptions] = useState<string[]>([]);
  const [originalABN, setOriginalABN] = useState('');

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
    additionalDirectors: [] as { id?: string; firstName: string; surname: string; email?: string; phone?: string }[],
    entity: '',
    industryType: '',
  });

  useEffect(() => {
    fetchReferrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchReferrer = async () => {
    try {
      const response = await fetch(`/api/admin/referrers/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch referrer');
      }

      const data = await response.json();
      const referrer = data.referrer;

      // Format ABN with spaces
      const formattedABN = formatABN(referrer.organisation?.abn || '');
      setOriginalABN(formattedABN);

      setFormData({
        directorFirstName: referrer.user?.first_name || '',
        directorSurname: referrer.user?.surname || '',
        contactPhone: referrer.user?.phone || '',
        contactEmail: referrer.user?.email || '',
        abn: formattedABN,
        companyName: referrer.organisation?.company_name || '',
        tradingName: referrer.organisation?.trading_name || '',
        companyAddress: referrer.organisation?.address || '',
        numberOfAdditionalDirectors: String(referrer.directors?.filter((d: any) => !d.is_primary).length || 0),
        additionalDirectors: referrer.directors?.filter((d: any) => !d.is_primary).map((d: any) => ({
          id: d.id,
          firstName: d.first_name,
          surname: d.surname,
          email: d.email || '',
          phone: d.phone || ''
        })) || [],
        entity: referrer.organisation?.entity_type || '',
        industryType: referrer.organisation?.industry_type || '',
      });

      setAbnStatus('valid');
      setIsFetching(false);
    } catch (error) {
      console.error('Error fetching referrer:', error);
      setError('Failed to load referrer details');
      setIsFetching(false);
    }
  };

  const formatABN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  };

  const handleABNLookup = async (abnNumber: string) => {
    const abnDigits = abnNumber.replace(/\s/g, '');

    setIsLookingUpABN(true);
    setAbnStatus('loading');
    setAbnMessage('');
    setError(null);

    try {
      const response = await fetch(`/api/abn/lookup?abn=${abnDigits}`);
      const data = await response.json();

      if (!response.ok) {
        setAbnStatus('invalid');
        setAbnMessage(data.message || 'Invalid ABN');
        setCompanyNameOptions([]);
      } else if (data.exists && abnNumber !== originalABN) {
        setAbnStatus('exists');
        setAbnMessage(data.message);
        setCompanyNameOptions([]);
      } else if (data.valid) {
        setAbnStatus('valid');
        setAbnMessage(data.message);
        setCompanyNameOptions(data.businessNames || []);

        if (data.businessNames && data.businessNames.length === 1) {
          setFormData(prev => ({ ...prev, companyName: data.businessNames[0] }));
        }

        if (data.entityType) {
          let entityValue = '';
          const entityTypeLower = data.entityType.toLowerCase();
          if (entityTypeLower.includes('sole trader') || entityTypeLower.includes('individual')) {
            entityValue = 'sole_trader';
          } else if (entityTypeLower.includes('public company')) {
            entityValue = 'public_company';
          } else if (entityTypeLower.includes('private company') || entityTypeLower.includes('proprietary')) {
            entityValue = 'private_company';
          } else if (entityTypeLower.includes('trust')) {
            entityValue = 'trust';
          } else if (entityTypeLower.includes('partnership')) {
            entityValue = 'partnership';
          }

          if (entityValue) {
            setFormData(prev => ({ ...prev, entity: entityValue }));
          }
        }
      }

      setIsLookingUpABN(false);
    } catch (err) {
      console.error('ABN lookup failed:', err);
      setIsLookingUpABN(false);
      setAbnStatus('invalid');
      setAbnMessage('Failed to verify ABN. Please try again.');
    }
  };

  const handleABNChange = async (value: string) => {
    const formatted = formatABN(value);
    const digits = formatted.replace(/\s/g, '');

    if (digits.length <= 11) {
      setFormData(prev => ({ ...prev, abn: formatted }));

      if (digits.length === 11 && formatted !== originalABN) {
        await handleABNLookup(formatted);
      } else if (digits.length < 11) {
        setAbnStatus('idle');
        setAbnMessage('');
      } else if (formatted === originalABN) {
        setAbnStatus('valid');
      }
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'numberOfAdditionalDirectors' && typeof value === 'string') {
      const count = value === 'None' ? 0 : parseInt(value);
      const currentDirectors = formData.additionalDirectors;
      const newDirectors: any[] = [];

      for (let i = 0; i < count; i++) {
        if (i < currentDirectors.length) {
          newDirectors.push(currentDirectors[i]);
        } else {
          newDirectors.push({ firstName: '', surname: '', email: '', phone: '' });
        }
      }

      setFormData(prev => ({ ...prev, additionalDirectors: newDirectors }));
    }
  };

  const handleAdditionalDirectorChange = (index: number, field: string, value: string) => {
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

    if (!formData.abn || formData.abn.replace(/\s/g, '').length !== 11) {
      setError('Please enter a valid ABN');
      return;
    }

    if (abnStatus === 'invalid') {
      setError('Please enter a valid ABN');
      return;
    }

    if (abnStatus === 'exists') {
      setError('This ABN already has a referrer account.');
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

    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending form data:', formData);
      const response = await fetch(`/api/admin/referrers/${params.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Update error:', result);
        setError(result.error || 'Failed to update referrer. Please try again.');
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Success',
        description: 'Referrer updated successfully',
      });

      router.push(`/admin/referrers/${params.id}`);
    } catch (err) {
      console.error('Update referrer error:', err);
      setError('Failed to update referrer. Please try again.');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={() => router.push(`/admin/referrers/${params.id}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Referrer Details
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Referrer</CardTitle>
          <CardDescription>
            Update referrer organization and contact details.
          </CardDescription>
        </CardHeader>

        <CardContent>
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
                    <Label htmlFor="abn">
                      ABN *
                      {isLookingUpABN && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                          Verifying...
                        </span>
                      )}
                    </Label>
                    <Input
                      id="abn"
                      placeholder="XX XXX XXX XXX"
                      value={formData.abn}
                      onChange={(e) => handleABNChange(e.target.value)}
                      required
                      disabled={isLoading || isLookingUpABN}
                      className={
                        abnStatus === 'valid' ? 'border-green-500' :
                        abnStatus === 'invalid' ? 'border-red-500' :
                        abnStatus === 'exists' ? 'border-orange-500' :
                        ''
                      }
                    />
                    {abnStatus === 'valid' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <p>{abnMessage || 'ABN is valid'}</p>
                      </div>
                    )}
                    {abnStatus === 'invalid' && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <p>{abnMessage}</p>
                      </div>
                    )}
                    {abnStatus === 'exists' && (
                      <div className="flex items-center gap-2 text-sm text-orange-500">
                        <AlertCircle className="h-4 w-4" />
                        <p>{abnMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    {companyNameOptions.length > 0 ? (
                      <Select
                        value={formData.companyName}
                        onValueChange={(value) => handleInputChange('companyName', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Company Name" />
                        </SelectTrigger>
                        <SelectContent>
                          {companyNameOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="companyName"
                        placeholder="Company Name"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    )}
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
                        <SelectItem value="0">None</SelectItem>
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
                      <div key={index} className="space-y-2">
                        <div className="flex gap-3 items-center">
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
                        <div className="flex gap-3 pl-11">
                          <Input
                            placeholder="Email (optional)"
                            type="email"
                            value={director.email || ''}
                            onChange={(e) => handleAdditionalDirectorChange(index, 'email', e.target.value)}
                            disabled={isLoading}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Phone (optional)"
                            type="tel"
                            value={director.phone || ''}
                            onChange={(e) => handleAdditionalDirectorChange(index, 'phone', e.target.value)}
                            disabled={isLoading}
                            className="flex-1"
                          />
                        </div>
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
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/referrers/${params.id}`)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Referrer'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
