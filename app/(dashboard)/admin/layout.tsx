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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  superAdminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard' },
  { name: 'Opportunities', href: '/admin/opportunities' },
  { name: 'Applications', href: '/admin/applications' },
  { name: 'Settlements', href: '/admin/settlements/upcoming' },
  { name: 'Clients', href: '/admin/clients' },
  { name: 'Referrers', href: '/admin/referrers' },
  { name: 'Potential Referrers', href: '/admin/potential-referrers' },
  { name: 'Users', href: '/admin/users', superAdminOnly: true },
  { name: 'Settings', href: '/admin/settings', superAdminOnly: true },
];

export default function AdminLayout({
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const user = data.user || data;
          setUserRole(user.role);
          setUserName(user.first_name || user.firstName || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

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

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(
    (item) => !item.superAdminOnly || userRole === 'super_admin'
  );

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
                className="xl:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-[#0f2a2a]"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <Link href="/admin/dashboard" className="ml-2 xl:ml-0">
                <Image
                  src="/logo.jpg"
                  alt="Loanease"
                  width={200}
                  height={100}
                  className="!h-[56px] !w-auto"
                  priority
                />
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden xl:flex items-center space-x-1">
              {filteredNavigation.map((item) => {
                // Check if viewing opportunity from applications (via ?from=applications)
                const isFromApplications = typeof window !== 'undefined' && window.location.search.includes('from=applications');
                const isOpportunityDetail = pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities';

                let isActive = pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                // Special case: highlight Applications instead of Opportunities when viewing from applications
                if (isFromApplications && isOpportunityDetail) {
                  if (item.href === '/admin/applications') {
                    isActive = true;
                  } else if (item.href === '/admin/opportunities') {
                    isActive = false;
                  }
                }

                return (
                  <LoadingLink
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
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

            {/* Right side: Welcome, Logout */}
            <div className="flex items-center space-x-3">
              {userName && (
                <span className="hidden md:block text-sm text-gray-300">
                  Welcome, {userName.split(' ')[0]}
                </span>
              )}

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

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-[#0f2a2a]">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => {
                const isFromApplications = typeof window !== 'undefined' && window.location.search.includes('from=applications');
                const isOpportunityDetail = pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities';

                let isActive = pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                if (isFromApplications && isOpportunityDetail) {
                  if (item.href === '/admin/applications') {
                    isActive = true;
                  } else if (item.href === '/admin/opportunities') {
                    isActive = false;
                  }
                }

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
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
