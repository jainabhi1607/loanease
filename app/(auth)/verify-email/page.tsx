'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [message, setMessage] = useState('');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');

        // Check if user has an active session using JWT auth
        const meResponse = await fetch('/api/auth/me');

        if (meResponse.ok) {
          setHasSession(true);
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/referrer/dashboard');
          }, 3000);
        }
      } else {
        if (data.error?.includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired.');
        } else if (data.error?.includes('already verified')) {
          setStatus('success');
          setMessage('Your email is already verified.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred during verification.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
              <CardDescription>Please wait while we verify your email address...</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
              <CardDescription className="mt-2">{message}</CardDescription>
            </>
          )}

          {(status === 'error' || status === 'expired') && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
              <CardDescription className="mt-2">{message}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center">
              {hasSession ? (
                <p className="text-sm text-gray-600 mb-4">
                  Redirecting you to your dashboard...
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    You can now login to your account.
                  </p>
                  <Link href="/login">
                    <Button className="w-full">
                      Go to Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Your verification link has expired. Please request a new one.
              </p>
              <Link href="/verify-email-pending">
                <Button className="w-full">
                  Request New Verification Email
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
