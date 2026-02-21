'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailPendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
      } else {
        setResendError(data.error || 'Failed to resend verification email');
      }
    } catch {
      setResendError('An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We&apos;ve sent a verification link to
            {email && (
              <span className="block font-medium text-gray-900 mt-1">
                {email}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 text-center">
            <p>Please check your email and click the verification link to complete your registration.</p>
            <p className="mt-2">The link will expire shortly. Please check your email promptly.</p>
          </div>

          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">
              Verification email has been resent. Please check your inbox.
            </div>
          )}

          {resendError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {resendError}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              disabled={isResending || resendSuccess}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend verification email
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <span>Already verified? </span>
              <Link href="/login" className="text-blue-600 hover:text-blue-500">
                Go to login
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              If you don&apos;t see the email, check your spam folder.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <VerifyEmailPendingContent />
    </Suspense>
  );
}