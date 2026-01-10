'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditReferrerAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
  };
  organization: {
    id: string;
    entity_name: string;
    abn?: string;
    trading_name?: string;
    address?: string;
    industry_type?: string;
    entity_type?: string;
  };
  directors: any[];
  onSuccess: () => void;
}

export function EditReferrerAccountDialog({
  open,
  onOpenChange,
  currentUser,
  organization,
  directors,
  onSuccess,
}: EditReferrerAccountDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const [directorFirstName, setDirectorFirstName] = useState('');
  const [directorSurname, setDirectorSurname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [abn, setAbn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [numDirectors, setNumDirectors] = useState('3');
  const [directorNames, setDirectorNames] = useState<Array<{ firstName: string; surname: string }>>([]);
  const [industryType, setIndustryType] = useState('');
  const [entity, setEntity] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (open) {
      // Populate form with current data
      setDirectorFirstName(currentUser.first_name);
      setDirectorSurname(currentUser.surname);
      setContactPhone(currentUser.phone);
      setContactEmail(currentUser.email);
      setAbn(organization.abn || '');
      setCompanyName(organization.entity_name || '');
      setTradingName(organization.trading_name || '');
      setCompanyAddress(organization.address || '');
      setIndustryType(organization.industry_type || '');
      setEntity(organization.entity_type || '');

      // Set directors
      setNumDirectors(directors.length.toString());
      setDirectorNames(directors.map(d => ({
        firstName: d.first_name || '',
        surname: d.surname || ''
      })));
    }
  }, [open, currentUser, organization, directors]);

  useEffect(() => {
    const count = parseInt(numDirectors) || 0;
    setDirectorNames(prev => {
      const newArray = [...prev];
      while (newArray.length < count) {
        newArray.push({ firstName: '', surname: '' });
      }
      return newArray.slice(0, count);
    });
  }, [numDirectors]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Update user details
      const userResponse = await fetch(`/api/referrer/account/update-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: directorFirstName,
          surname: directorSurname,
          phone: contactPhone,
          email: contactEmail,
          ...(password && { password }),
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to update user details');
      }

      // Update organization details
      const orgResponse = await fetch(`/api/referrer/account/update-organization`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: companyName,
          trading_name: tradingName,
          abn: abn,
          address: companyAddress,
          industry_type: industryType,
          entity_type: entity,
          directors: directorNames,
        }),
      });

      if (!orgResponse.ok) {
        throw new Error('Failed to update organization details');
      }

      toast({
        title: 'Success',
        description: 'Account details updated successfully',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: 'Error',
        description: 'Failed to update account details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-teal-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-teal-800">Edit Referrer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Director Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="directorFirstName">Director First Name</Label>
              <Input
                id="directorFirstName"
                value={directorFirstName}
                onChange={(e) => setDirectorFirstName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label htmlFor="directorSurname">Director Surname</Label>
              <Input
                id="directorSurname"
                value={directorSurname}
                onChange={(e) => setDirectorSurname(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                className="bg-white"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
                className="whitespace-nowrap"
              >
                Generate Password
              </Button>
            </div>
          </div>

          {/* ABN */}
          <div>
            <Label htmlFor="abn">ABN</Label>
            <Input
              id="abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Company Name */}
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Trading Name */}
          <div>
            <Label htmlFor="tradingName">Trading Name</Label>
            <Input
              id="tradingName"
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Company Address */}
          <div>
            <Label htmlFor="companyAddress">Company Address</Label>
            <Input
              id="companyAddress"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Number of Directors */}
          <div>
            <Label htmlFor="numDirectors">No. of Add. Directors</Label>
            <Select value={numDirectors} onValueChange={setNumDirectors}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Director Names */}
          {directorNames.length > 0 && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <Label className="mb-3 block font-semibold text-green-800">Director Names:</Label>
              <div className="space-y-3">
                {directorNames.map((director, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-semibold">
                      {index + 1}
                    </div>
                    <Input
                      value={director.firstName}
                      onChange={(e) => {
                        const newNames = [...directorNames];
                        newNames[index].firstName = e.target.value;
                        setDirectorNames(newNames);
                      }}
                      placeholder="First Name"
                      className="bg-white"
                    />
                    <Input
                      value={director.surname}
                      onChange={(e) => {
                        const newNames = [...directorNames];
                        newNames[index].surname = e.target.value;
                        setDirectorNames(newNames);
                      }}
                      placeholder="Surname"
                      className="bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Type */}
          <div>
            <Label htmlFor="industryType">Your Industry Type</Label>
            <Select value={industryType} onValueChange={setIndustryType}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accounting">Accounting</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity */}
          <div>
            <Label htmlFor="entity">Entity</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private_company">Private Company</SelectItem>
                <SelectItem value="public_company">Public Company</SelectItem>
                <SelectItem value="sole_trader">Sole Trader</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="trust">Trust</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-teal-700 hover:bg-teal-800"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
