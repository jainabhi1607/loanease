'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Send, Phone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Call the login API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.requiresVerification) {
          setError(data.error);
          // Optionally redirect to resend verification page
        } else if (data.attemptsLeft !== undefined) {
          setError(`${data.error}. ${data.attemptsLeft} attempts remaining.`);
        } else {
          setError(data.error || 'Invalid email or password');
        }
        return;
      }

      if (data.success && data.user) {
        // Debug logging
        console.log('Login response:', data);
        console.log('User role:', data.user.role);
        
        // Store remember me preference if checked
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        // Check if user needs 2FA
        if (data.user.twoFAEnabled) {
          // 2FA code should already be sent by the API
          router.push(`/login/verify-2fa?email=${encodeURIComponent(email)}`);
        } else {
          // Redirect based on user role
          // Admins go to /admin/dashboard, everyone else goes to /dashboard
          if (data.user.role === 'super_admin' || data.user.role === 'admin_team') {
            console.log('Redirecting to admin dashboard');
            router.push('/admin/dashboard');
          } else {
            console.log('Redirecting to dashboard');
            router.push('/dashboard');
          }
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="Loancase"
              width={120}
              height={40}
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to Loancase
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.toLowerCase().trim())}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me for 30 days
                </Label>
              </div>
              
              <Link
                href="/reset-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-[#1a3a3a] hover:bg-[#0f2a2a] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Are you a referrer?{' '}
              <Link
                href="/signup"
                className="text-primary hover:underline font-medium"
              >
                Register here
              </Link>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[#02383B] text-[#02383B] hover:bg-[#EDFFD7]"
                >
                  Contact us
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#EDFFD7] border-none max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-[#02383B] text-xl font-semibold">
                    Contact us
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 text-[#02383B]">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Chat with us</h3>
                    <p className="text-sm">For new and existing Opportunities and application enquiries email</p>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <a href="mailto:apps@cluefinance.com.au" className="font-semibold hover:underline">
                        apps@cluefinance.com.au
                      </a>
                    </div>
                    <p className="text-sm">For all partnership enquiries email</p>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <a href="mailto:partners@cluefinance.com.au" className="font-semibold hover:underline">
                        partners@cluefinance.com.au
                      </a>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Call us</h3>
                    <p className="text-sm">Call our team Monday to Friday 9.00am to 5.30pm</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href="tel:1300007878" className="hover:underline">
                        1300 00 78 78
                      </a>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}