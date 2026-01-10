'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get('email');

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if user has a valid session that requires 2FA
  useEffect(() => {
    const checkSession = async () => {
      if (!email) {
        router.push('/login');
        return;
      }

      try {
        // Check if user has a valid JWT session
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          // No valid session, redirect to login
          document.cookie = 'cf_2fa_verified=; path=/; max-age=0';
          router.push('/login');
          return;
        }

        const userData = await response.json();

        // If session email doesn't match the URL email, redirect to login
        if (userData.email?.toLowerCase() !== email.toLowerCase()) {
          // Logout and redirect
          await fetch('/api/auth/logout', { method: 'POST' });
          document.cookie = 'cf_2fa_verified=; path=/; max-age=0';
          router.push('/login');
          return;
        }

        setIsCheckingSession(false);
      } catch (err) {
        console.error('Session check error:', err);
        router.push('/login');
      }
    };

    checkSession();
  }, [email, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow single digit for regular typing
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    // Extract only digits from pasted content
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < digits.length && i < 6; i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode);

      // Focus the next empty input or the last filled one
      const nextEmptyIndex = newCode.findIndex(d => d === '');
      const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, 5);
      const inputToFocus = document.getElementById(`code-${focusIndex}`);
      inputToFocus?.focus();

      // Auto-submit if all 6 digits are filled
      if (digits.length === 6) {
        handleVerify(digits);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const finalCode = verificationCode || code.join('');

    if (finalCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use API route for verification with rate limiting
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: finalCode,
          email: email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited or locked
          setError(result.error);
          // Clear the code inputs on lockout
          if (result.error.includes('locked')) {
            setCode(['', '', '', '', '', '']);
          }
        } else {
          // Invalid code
          setError(result.error || 'Invalid or expired code. Please try again.');
          if (result.attemptsLeft) {
            setError(`${result.error} (${result.attemptsLeft} attempts remaining)`);
          }
        }
        setIsLoading(false);
        return;
      }

      // Set 2FA verified cookie
      document.cookie = `cf_2fa_verified=${result.userId}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

      toast({
        title: 'Success',
        description: 'Login successful!',
      });

      // Force page reload to ensure middleware picks up the cookie
      if (result.role === 'super_admin' || result.role === 'admin_team') {
        window.location.href = '/admin/dashboard';
      } else {
        // All other users (referrers, clients) go to /dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setIsResending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(result.error);
        } else {
          setError(result.error || 'Failed to resend code. Please try again.');
        }
        return;
      }

      // Clear the existing code input
      setCode(['', '', '', '', '', '']);

      // Set resend timer to 60 seconds
      setResendTimer(60);

      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent to your email.',
      });

      if (result.attemptsLeft !== undefined && result.attemptsLeft < 3) {
        toast({
          title: 'Resend Limit',
          description: `You have ${result.attemptsLeft} resend attempts remaining this hour.`,
          variant: 'default',
        });
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = async () => {
    // Logout the user
    await fetch('/api/auth/logout', { method: 'POST' });
    // Clear any cookies
    document.cookie = 'cf_2fa_verified=; path=/; max-age=0';
    router.push('/login');
  };

  // Show loading while checking session or if no email
  if (!email || isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent a 6-digit code to {email}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Enter verification code</Label>
            <div className="flex gap-2 justify-center">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg font-semibold"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendTimer > 0 || isResending}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendTimer > 0
                ? `Resend code in ${resendTimer}s`
                : 'Resend verification code'}
            </button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            onClick={() => handleVerify()}
            className="w-full"
            disabled={isLoading || code.join('').length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full"
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}
