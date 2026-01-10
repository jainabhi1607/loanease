'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingLink } from '@/components/ui/loading-link';
import {
  LogOut,
  Loader2,
  Menu,
  X,
  Send,
  Phone,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const allNavigation = [
  { name: 'Dashboard', href: '/referrer/dashboard' },
  { name: 'Opportunities', href: '/referrer/opportunities' },
  { name: 'Applications', href: '/referrer/applications' },
  { name: 'Clients', href: '/referrer/clients' },
  { name: 'Pre-Qualify', href: '/referrer/pre-assessment' },
  { name: 'Account', href: '/referrer/account', adminOnly: true },
];

export default function ReferrerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userLastName, setUserLastName] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
        setUserName(data.firstName || null);
        setUserLastName(data.lastName || null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Get user initials (first letter of first name + first letter of last name)
  const getUserInitials = () => {
    const firstInitial = userName ? userName.charAt(0).toUpperCase() : '';
    const lastInitial = userLastName ? userLastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial || '?';
  };

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => {
    // If item is admin only (Account page), only show if user is referrer_admin
    // Hide by default when role is not yet loaded (null) or if user is Team Member
    if (item.adminOnly && userRole !== 'referrer_admin') {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (response.ok) {
        localStorage.removeItem('rememberMe');
        toast({
          title: 'Logged out successfully',
          description: 'You have been logged out of your account.',
        });
        window.location.href = '/login';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1a3a3a] sticky top-0 z-40">
        <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[85px]">
            {/* Logo and Mobile menu button */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-[#0f2a2a]"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <Link href="/referrer/dashboard" className="ml-2 lg:ml-0">
                <Image
                  src="/logo.svg"
                  alt="Clue"
                  width={80}
                  height={26}
                  priority
                />
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/referrer/dashboard' && pathname.startsWith(item.href));

                return (
                  <LoadingLink
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-gray-300 hover:text-white'
                    )}
                  >
                    {item.name}
                  </LoadingLink>
                );
              })}
            </nav>

            {/* Right side: Contact Us, Welcome, User Initials */}
            <div className="flex items-center space-x-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-[5px] bg-[#00D37F] text-[#1a3a3a] hover:bg-[#00b86d] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>
                    </svg>
                    Contact Us
                  </button>
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

              {userName && (
                <span className="hidden md:block text-sm text-gray-300">
                  Welcome, {userName}
                </span>
              )}

              {/* User Initials Circle */}
              <div className="flex items-center gap-2">
                <Link
                  href="/referrer/account?tab=profile"
                  className="w-8 h-8 rounded-full bg-[#00D37F] flex items-center justify-center text-[#1a3a3a] text-sm font-semibold hover:bg-[#00b86d] transition-colors"
                  title="View Profile"
                >
                  {getUserInitials()}
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  disabled={isLoggingOut}
                  className="text-gray-300 hover:text-white hover:bg-[#0f2a2a] p-1"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#0f2a2a]">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/referrer/dashboard' && pathname.startsWith(item.href));

                return (
                  <LoadingLink
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'block px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-[#0f2a2a] text-white'
                        : 'text-gray-300 hover:bg-[#0f2a2a] hover:text-white'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </LoadingLink>
                );
              })}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="block w-full text-left px-3 py-2 text-sm font-medium text-[#00D37F] hover:text-[#00b86d]"
                  >
                    Contact Us
                  </button>
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
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
