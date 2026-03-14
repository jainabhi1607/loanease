'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingLink } from '@/components/ui/loading-link';
import {
  LogOut,
  Loader2,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  superAdminOnly?: boolean;
  children?: { name: string; href: string }[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard' },
  { name: 'Opportunities', href: '/admin/opportunities' },
  {
    name: 'Application',
    href: '/admin/applications',
    children: [
      { name: 'Applications', href: '/admin/applications' },
      { name: 'Applications Archive', href: '/admin/applications/archive' },
    ],
  },
  { name: 'Settlements', href: '/admin/settlements/upcoming' },
  { name: 'Clients', href: '/admin/clients' },
  { name: 'Referrers', href: '/admin/referrers' },
  { name: 'Potential Referrers', href: '/admin/potential-referrers' },
  { name: 'Users', href: '/admin/users', superAdminOnly: true },
  { name: 'Settings', href: '/admin/settings', superAdminOnly: true },
];

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
                const isFromApplications = searchParams.get('from') === 'applications';
                const isFromSettlements = searchParams.get('from') === 'settlements';
                const isOpportunityDetail = pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities';

                let isActive = pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                // When viewing opportunity detail from applications or settlements, highlight the correct menu
                if (isOpportunityDetail) {
                  if (isFromApplications) {
                    if (item.href === '/admin/applications') isActive = true;
                    else if (item.href === '/admin/opportunities') isActive = false;
                  } else if (isFromSettlements) {
                    if (item.href === '/admin/settlements/upcoming') isActive = true;
                    else if (item.href === '/admin/opportunities') isActive = false;
                  }
                }

                // Dropdown menu for items with children
                if (item.children) {
                  const isChildActive = item.children.some(
                    (child) => pathname === child.href || pathname.startsWith(child.href)
                  ) || (isOpportunityDetail && isFromApplications);

                  return (
                    <div key={item.name} className="relative group">
                      <button
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                          isChildActive
                            ? 'text-white'
                            : 'text-gray-300 hover:text-white'
                        )}
                      >
                        {item.name}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px]">
                          {item.children.map((child) => {
                            const isSubActive = pathname === child.href || pathname.startsWith(child.href);
                            return (
                              <LoadingLink
                                key={child.name}
                                href={child.href}
                                className={cn(
                                  'block px-4 py-2.5 text-sm transition-colors',
                                  isSubActive
                                    ? 'text-[#02383B] font-semibold bg-gray-50'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#02383B]'
                                )}
                              >
                                {child.name}
                              </LoadingLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
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
                const isFromApplications = searchParams.get('from') === 'applications';
                const isFromSettlements = searchParams.get('from') === 'settlements';
                const isOpportunityDetail = pathname.startsWith('/admin/opportunities/') && pathname !== '/admin/opportunities';

                let isActive = pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                if (isOpportunityDetail) {
                  if (isFromApplications) {
                    if (item.href === '/admin/applications') isActive = true;
                    else if (item.href === '/admin/opportunities') isActive = false;
                  } else if (isFromSettlements) {
                    if (item.href === '/admin/settlements/upcoming') isActive = true;
                    else if (item.href === '/admin/opportunities') isActive = false;
                  }
                }

                if (item.children) {
                  return (
                    <div key={item.name}>
                      <span className="block px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {item.name}
                      </span>
                      {item.children.map((child) => {
                        const isSubActive = pathname === child.href || pathname.startsWith(child.href);
                        return (
                          <LoadingLink
                            key={child.name}
                            href={child.href}
                            className={cn(
                              'block pl-6 pr-3 py-2 text-sm font-medium rounded-md',
                              isSubActive
                                ? 'bg-[#0f2a2a] text-white'
                                : 'text-gray-300 hover:bg-[#0f2a2a] hover:text-white'
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {child.name}
                          </LoadingLink>
                        );
                      })}
                    </div>
                  );
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
