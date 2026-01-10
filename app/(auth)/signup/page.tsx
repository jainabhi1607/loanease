'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Building2, CheckCircle, Check, X } from 'lucide-react';
import { AddressAutocomplete, AddressData } from '@/components/address-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Field name to label mapping for user-friendly error messages
const fieldLabels: Record<string, string> = {
  directorFirstName: 'Director First Name',
  directorSurname: 'Director Surname',
  contactPhone: 'Contact Phone',
  contactEmail: 'Contact Email',
  abn: 'ABN',
  companyName: 'Company Name',
  tradingName: 'Trading Name',
  companyAddress: 'Company Address',
  entity: 'Entity Type',
  industryType: 'Industry Type',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  acceptTerms: 'Terms and Conditions',
};

export default function SignupPage() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpABN, setIsLookingUpABN] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLookedUpABN, setHasLookedUpABN] = useState(false);
  const [abnStatus, setAbnStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'exists'>('idle');
  const [abnMessage, setAbnMessage] = useState<string>('');
  const [abnEntityType, setAbnEntityType] = useState<string>('');
  
  // Email validation states
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Honeypot field for bot detection
  const [honeypot, setHoneypot] = useState('');
  
  // CSRF token
  const [csrfToken, setCsrfToken] = useState('');
  
  // Terms and conditions state
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  // Generate CSRF token and load terms on mount
  useEffect(() => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setCsrfToken(token);
    // Store in session storage for validation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('signup_csrf', token);
    }

    // Load terms and conditions from database
    const loadTerms = async () => {
      try {
        const response = await fetch('/api/settings/terms');
        const data = await response.json();
        setTermsContent(data.terms);
      } catch (error) {
        console.error('Failed to load terms:', error);
      } finally {
        setIsLoadingTerms(false);
      }
    };
    loadTerms();
  }, []);
  
  // Form fields
  const [formData, setFormData] = useState({
    // Director/Contact Information
    directorFirstName: '',
    directorSurname: '',
    contactPhone: '',
    contactEmail: '',
    
    // Company Information
    abn: '',
    companyName: '',
    tradingName: '',
    companyAddress: '',
    companySuburb: '',
    companyState: '',
    companyPostcode: '',
    
    // Additional Directors
    numberOfAdditionalDirectors: 'None',
    additionalDirectors: [] as { firstName: string; surname: string }[],
    
    // Entity and Industry
    entity: '',
    industryType: '',
    
    // Account Security
    password: '',
    confirmPassword: '',
    
    // Terms Acceptance
    acceptTerms: false,
  });

  // Company name options from ABN lookup
  const [companyNameOptions, setCompanyNameOptions] = useState<string[]>([]);

  // Helper function to set error and scroll to it
  const setErrorAndScroll = (errorMessage: string) => {
    setError(errorMessage);
    // Use setTimeout to ensure the error element is rendered before scrolling
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };
  
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
  
  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    // Check for common disposable email domains
    const disposableDomains = [
      'tempmail.com', 
      'throwaway.email', 
      '10minutemail.com', 
      'guerrillamail.com',
      'mailinator.com',
      'trashmail.com',
      'yopmail.com'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) return false;
    
    return true;
  };
  
  // Check email availability in database
  const checkEmailAvailability = async (email: string) => {
    if (!validateEmail(email)) {
      setEmailStatus('invalid');
      setEmailMessage('Invalid or disposable email');
      return;
    }
    
    setIsCheckingEmail(true);
    setEmailStatus('checking');
    setEmailMessage('');
    
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.available) {
        setEmailStatus('available');
        setEmailMessage('Email is available');
      } else if (data.exists) {
        setEmailStatus('taken');
        setEmailMessage(data.message || 'This email is already registered');
      } else if (data.isDisposable) {
        setEmailStatus('invalid');
        setEmailMessage(data.message || 'Disposable emails are not allowed');
      } else {
        setEmailStatus('invalid');
        setEmailMessage(data.message || 'Invalid email');
      }
    } catch (error) {
      console.error('Email check failed:', error);
      // Don't block on error, just validate format
      if (validateEmail(email)) {
        setEmailStatus('idle');
        setEmailMessage('');
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };
  
  // Handle email input with debouncing
  const handleEmailChange = (value: string) => {
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({ ...prev, contactEmail: sanitizedValue }));
    
    // Clear previous timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
    }
    
    // Reset status if email is empty
    if (!value) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }
    
    // Set new timeout for email check (debounce)
    const timeout = setTimeout(() => {
      checkEmailAvailability(sanitizedValue);
    }, 500); // Wait 500ms after user stops typing
    
    setEmailCheckTimeout(timeout);
  };
  
  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string): string => {
    // Remove any HTML tags and script content
    const div = document.createElement('div');
    div.textContent = input;
    const sanitized = div.innerHTML;
    
    // Additional sanitization for common XSS patterns
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .trim();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    // Sanitize string inputs (except password fields and email which has its own handler)
    let finalValue = value;
    if (typeof value === 'string' && field !== 'password' && field !== 'confirmPassword' && field !== 'contactEmail') {
      finalValue = sanitizeInput(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: finalValue }));
    
    // Validate password as user types
    if (field === 'password' && typeof value === 'string') {
      validatePassword(value);
    }
    
    // Clear company name options if ABN is changed
    if (field === 'abn') {
      setCompanyNameOptions([]);
      setFormData(prev => ({ ...prev, companyName: '' }));
    }
    
    // Handle additional directors count change
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
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => {
      const newDirectors = [...prev.additionalDirectors];
      newDirectors[index] = { ...newDirectors[index], [field]: sanitizedValue };
      return { ...prev, additionalDirectors: newDirectors };
    });
  };

  const formatABN = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XX XXX XXX XXX
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
        setFormData(prev => ({ ...prev, companyName: '' }));
      } else if (data.exists) {
        // ABN already registered
        setAbnStatus('exists');
        setAbnMessage(data.message);
        setCompanyNameOptions([]);
        setFormData(prev => ({ ...prev, companyName: '' }));
      } else if (data.valid) {
        // Valid ABN, not registered yet
        setAbnStatus('valid');
        setAbnMessage(data.message);
        setCompanyNameOptions(data.businessNames || []);
        setAbnEntityType(data.entityType || '');
        
        // Auto-select if only one business name
        if (data.businessNames && data.businessNames.length === 1) {
          setFormData(prev => ({ ...prev, companyName: data.businessNames[0] }));
        } else {
          setFormData(prev => ({ ...prev, companyName: '' }));
        }
        
        // Auto-set entity type if available
        if (data.entityType) {
          // Map ABR entity types to our form options
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
      setHasLookedUpABN(true);
    } catch (err) {
      console.error('ABN lookup failed:', err);
      setIsLookingUpABN(false);
      setAbnStatus('invalid');
      setAbnMessage('Failed to verify ABN. Please try again.');
    }
  };

  const handleABNChange = async (value: string, forceLookup: boolean = false) => {
    const formatted = formatABN(value);
    const digits = formatted.replace(/\s/g, '');
    
    if (digits.length <= 11) {
      handleInputChange('abn', formatted);
      
      // Auto-lookup when 11 digits are entered
      if (digits.length === 11) {
        // Force lookup on paste or if not already looked up
        if (forceLookup || !hasLookedUpABN) {
          await handleABNLookup(formatted);
        }
      } else if (digits.length < 11) {
        // Reset lookup state if user edits the ABN
        setHasLookedUpABN(false);
        setCompanyNameOptions([]);
        setFormData(prev => ({ ...prev, companyName: '' }));
        setAbnStatus('idle');
        setAbnMessage('');
      }
    }
  };

  const handleABNPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Handle the paste with force lookup flag
    await handleABNChange(pastedText, true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check honeypot (bot detection)
    if (honeypot) {
      // Silently fail - don't give feedback to bots
      console.log('Bot detected');
      return;
    }

    // Validation
    if (!formData.directorFirstName || !formData.directorSurname) {
      setErrorAndScroll('Please enter director name');
      return;
    }

    if (!formData.contactPhone || !formData.contactEmail) {
      setErrorAndScroll('Please enter contact details');
      return;
    }

    // Validate phone number length
    if (formData.contactPhone.replace(/\D/g, '').length < 10) {
      setErrorAndScroll('Phone number must be at least 10 digits');
      return;
    }

    // Check email validation status
    if (emailStatus === 'invalid') {
      setErrorAndScroll('Please enter a valid email address');
      return;
    }

    if (emailStatus === 'taken') {
      setErrorAndScroll('This email is already registered. Please sign in or use a different email.');
      return;
    }

    if (!formData.abn || formData.abn.replace(/\s/g, '').length !== 11) {
      setErrorAndScroll('Please enter a valid ABN');
      return;
    }

    // Check ABN validation status
    if (abnStatus === 'invalid') {
      setErrorAndScroll('Please enter a valid ABN');
      return;
    }

    if (abnStatus === 'exists') {
      setErrorAndScroll('This ABN already has a referrer account. Please sign in.');
      return;
    }

    if (!formData.companyName) {
      setErrorAndScroll('Please select or enter a company name');
      return;
    }

    if (!formData.companyAddress) {
      setErrorAndScroll('Please enter company address');
      return;
    }

    if (!formData.entity) {
      setErrorAndScroll('Please select an entity type');
      return;
    }

    if (!formData.industryType) {
      setErrorAndScroll('Please select your industry type');
      return;
    }

    // Validate additional directors if any
    if (formData.additionalDirectors.length > 0) {
      for (let i = 0; i < formData.additionalDirectors.length; i++) {
        const director = formData.additionalDirectors[i];
        if (!director.firstName || !director.surname) {
          setErrorAndScroll(`Please enter full name for additional director ${i + 1}`);
          return;
        }
      }
    }

    // Validate email
    if (!validateEmail(formData.contactEmail)) {
      setErrorAndScroll('Please enter a valid email address. Disposable email addresses are not allowed.');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setErrorAndScroll('Password must be at least 8 characters');
      return;
    }

    // Check password strength
    const allPasswordRequirementsMet =
      passwordStrength.minLength &&
      passwordStrength.hasUpperCase &&
      passwordStrength.hasLowerCase &&
      passwordStrength.hasNumber &&
      passwordStrength.hasSpecialChar;

    if (!allPasswordRequirementsMet) {
      setErrorAndScroll('Password does not meet all requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorAndScroll('Passwords do not match');
      return;
    }

    if (!formData.acceptTerms) {
      setErrorAndScroll('Please accept the Terms and Conditions');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          ...formData,
          csrfToken
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Parse validation errors from the API response
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((detail: { path?: string[]; message?: string }) => {
            const fieldName = detail.path?.[0] || 'Unknown field';
            const label = fieldLabels[fieldName] || fieldName;
            return `${label}: ${detail.message || 'Invalid value'}`;
          });
          setErrorAndScroll(errorMessages.join('. '));
        } else {
          setErrorAndScroll(result.error || 'Registration failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Success - check if email verification is required
      if (result.requiresVerification) {
        // Redirect to verification pending page
        router.push(`/verify-email-pending?email=${encodeURIComponent(result.email)}`);
      } else if (result.requiresLogin) {
        // Auto-login failed, redirect to login
        router.push('/login?registered=true');
      } else {
        // Auto-login successful, redirect to referrer dashboard
        router.push('/referrer/dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorAndScroll('Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Referrer Registration
          </CardTitle>
          <CardDescription className="text-center">
            Register your company to start referring loan opportunities
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert ref={errorRef} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Director Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Director Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Director First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Director First Name"
                    value={formData.directorFirstName}
                    onChange={(e) => handleInputChange('directorFirstName', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="surname">
                    Director Surname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="surname"
                    placeholder="Director Surname"
                    value={formData.directorSurname}
                    onChange={(e) => handleInputChange('directorSurname', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Contact Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Director Phone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Contact Email <span className="text-red-500">*</span>
                    {isCheckingEmail && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                        Checking availability...
                      </span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Contact Email"
                    value={formData.contactEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    disabled={isLoading}
                    className={
                      emailStatus === 'available' ? 'border-green-500' :
                      emailStatus === 'taken' ? 'border-orange-500' :
                      emailStatus === 'invalid' ? 'border-red-500' :
                      ''
                    }
                  />
                  {emailStatus === 'available' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <p>{emailMessage}</p>
                    </div>
                  )}
                  {emailStatus === 'taken' && (
                    <div className="flex items-start gap-2 text-sm text-orange-500">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p>{emailMessage}</p>
                        <Link 
                          href="/login" 
                          className="text-primary underline hover:no-underline"
                        >
                          Click here to sign in
                        </Link>
                      </div>
                    </div>
                  )}
                  {emailStatus === 'invalid' && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <p>{emailMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="abn">
                    ABN <span className="text-red-500">*</span>
                    {isLookingUpABN && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                        Verifying ABN...
                      </span>
                    )}
                  </Label>
                  <Input
                    id="abn"
                    placeholder="XX XXX XXX XXX"
                    value={formData.abn}
                    onChange={(e) => handleABNChange(e.target.value)}
                    onPaste={handleABNPaste}
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
                    <div className="flex items-start gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p>{abnMessage}</p>
                        {abnEntityType && (
                          <p className="text-xs text-muted-foreground mt-1">Entity type: {abnEntityType}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {abnStatus === 'invalid' && (
                    <div className="flex items-start gap-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <p>{abnMessage}</p>
                    </div>
                  )}
                  {abnStatus === 'exists' && (
                    <div className="flex items-start gap-2 text-sm text-orange-500">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p>{abnMessage}</p>
                        <Link 
                          href="/login" 
                          className="text-primary underline hover:no-underline"
                        >
                          Click here to sign in
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                    {abnStatus !== 'valid' && abnStatus !== 'idle' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Enter valid ABN first)
                      </span>
                    )}
                  </Label>
                  {companyNameOptions.length > 0 ? (
                    <Select
                      value={formData.companyName}
                      onValueChange={(value) => handleInputChange('companyName', value)}
                      disabled={isLoading || abnStatus !== 'valid'}
                    >
                      <SelectTrigger className={abnStatus !== 'valid' ? 'opacity-50' : ''}>
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
                    <div>
                      <Input
                        id="companyName"
                        placeholder={abnStatus === 'valid' ? "No names found - enter manually" : "Enter valid ABN to enable"}
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        required
                        disabled={isLoading || abnStatus !== 'valid'}
                        className={abnStatus !== 'valid' ? 'opacity-50' : ''}
                      />
                      {abnStatus === 'valid' && companyNameOptions.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No business names found for this ABN. Please enter your company name manually.
                        </p>
                      )}
                    </div>
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
                <Label htmlFor="address">
                  Company Address <span className="text-red-500">*</span>
                </Label>
                <AddressAutocomplete
                  value={formData.companyAddress}
                  onChange={(value: string, addressData?: AddressData) => {
                    if (addressData) {
                      // Full address data from autocomplete or manual entry
                      setFormData(prev => ({
                        ...prev,
                        companyAddress: addressData.fullAddress,
                        companySuburb: addressData.suburb,
                        companyState: addressData.state,
                        companyPostcode: addressData.postcode
                      }));
                    } else {
                      // Just updating the text (typing)
                      setFormData(prev => ({ ...prev, companyAddress: value }));
                    }
                  }}
                  placeholder="Start typing address or enter manually"
                  required
                  disabled={isLoading}
                />
              </div>

            </div>

            {/* Additional Directors and Entity */}
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
                  <Label htmlFor="entity">
                    Entity <span className="text-red-500">*</span>
                  </Label>
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

              {/* Dynamic Additional Directors Fields */}
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
                <Label htmlFor="industryType">
                  Your Industry Type <span className="text-red-500">*</span>
                </Label>
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

            {/* Password */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Security</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
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
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
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

            {/* Terms & Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Terms & Conditions</h3>

              <div className="space-y-3">
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-gray-50">
                  {isLoadingTerms ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : termsContent ? (
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: termsContent }}
                    />
                  ) : (
                    <div className="text-sm space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">BACKGROUND</h4>
                        <p className="mb-2">A. Loanease is a provider of the Services.</p>
                        <p className="mb-2">B. The Referrer is a provider of the Referrer Services.</p>
                        <p className="mb-2">C. Subject to the terms of this Agreement:</p>
                        <p className="ml-4 mb-1">a. Loanease shall offer the Services to Referred Clients who are Introduced by the Referrer; and</p>
                        <p className="ml-4">b. where the Referrer provides Loanease with a Referral, Loanease will pay the Referrer the Referral Fees.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">OPERATIVE PART</h4>
                        <h4 className="font-semibold mb-2">1. TERM</h4>
                        <p className="mb-2">1.1 Term</p>
                        <p>This Agreement commences on the Commencement Date and continues unless terminated in accordance with this clause 1.2.</p>
                      </div>

                      <div className="text-muted-foreground italic">
                        Terms and conditions not yet configured. Please contact support.
                      </div>
                    </div>
                  )}
                </ScrollArea>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Terms & Conditions Acceptance</h4>
                  <p className="text-sm text-muted-foreground">
                    By clicking &quot;I Accept,&quot; you confirm that you have read, understood, and agree to be bound by the Terms and Conditions of . If you do not agree, please refrain from using our services.
                  </p>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                      disabled={isLoading}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="acceptTerms" 
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      I Accept the Terms and Conditions <span className="text-red-500">*</span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}