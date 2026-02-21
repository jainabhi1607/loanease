'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  openOpportunities: number;
  opportunityValue: number;
  openApplications: number;
  settledApplications: number;
  settledValue: number;
  conversionRatio: string;
}

interface Opportunity {
  id: string;
  opportunity_id: string;
  status: string;
  created_at: string;
  loan_amount: number;
  loan_type: string;
  asset_type: string;
  borrowing_entity: string;
  contact_name: string;
}

interface UserData {
  firstName: string;
  lastName: string;
}

export default function ReferrerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    openOpportunities: 0,
    opportunityValue: 0,
    openApplications: 0,
    settledApplications: 0,
    settledValue: 0,
    conversionRatio: '0',
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchDashboardData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const user = data.user || data;
        setUserData({ firstName: user.first_name || user.firstName, lastName: user.surname || user.lastName });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/referrer/dashboard');

      if (response.ok) {
        const data = await response.json();
        setStats(data.statistics);
        setOpportunities(data.recentOpportunities || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const formatAssetType = (assetType: string) => {
    const labels: { [key: string]: string } = {
      'commercial_property': 'Commercial Property',
      'residential_property': 'Residential Property',
      'vacant_land': 'Vacant Land',
    };
    return labels[assetType] || assetType || '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D37F] mx-auto"></div>
          <p className="mt-4 text-[#787274]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Welcome Section */}
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-[#EDFFD7] rounded-xl p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#02383B] mb-2">
                Welcome back, {userData?.firstName || 'User'}
              </h1>
              <p className="text-[#787274] mb-4">
                Pre-qualify your clients instantly with our advanced assessment tool
              </p>
              <div className="bg-white border-l-4 border-[#00D37F] px-4 py-2 rounded-r-lg rounded-l-[8px] inline-block">
                <span className="text-sm">
                  <span className="font-semibold text-gray-800">Key Advantage:</span>{' '}
                  <span className="text-[#787274]">Get instant pre-qualification results before submitting referrals</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/referrer/pre-assessment"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1a3a3a] text-white rounded-lg hover:bg-[#0f2a2a] transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                Pre-Qualify Client
              </Link>
              <Link
                href="/referrer/opportunities/add"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Lead
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Opportunities Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="h-[120px] w-full mb-4 flex items-center justify-center">
              <Image
                src="/icons/dahsboard-icon-1.png"
                alt="Opportunities"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold text-[#1a3a3a] mb-1">{stats.openOpportunities}</h2>
            <p className="text-sm text-[#787274] uppercase tracking-wide">Opportunities</p>
          </div>

          {/* Applications Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="h-[120px] w-full mb-4 flex items-center justify-center">
              <Image
                src="/icons/dahsboard-icon-2.png"
                alt="Applications"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold text-[#1a3a3a] mb-1">{stats.openApplications}</h2>
            <p className="text-sm text-[#787274] uppercase tracking-wide">Applications</p>
          </div>

          {/* Settlements Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="h-[120px] w-full mb-4 flex items-center justify-center">
              <Image
                src="/icons/dahsboard-icon-3.png"
                alt="Settlements"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold text-[#1a3a3a] mb-1">{formatCurrency(stats.settledValue)}</h2>
            <p className="text-sm text-[#787274] uppercase tracking-wide">Settlements</p>
          </div>

          {/* Conversion Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="h-[120px] w-full mb-4 flex items-center justify-center">
              <Image
                src="/icons/dahsboard-icon-4.png"
                alt="Conversion"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold text-[#1a3a3a] mb-1">{stats.conversionRatio}%</h2>
            <p className="text-sm text-[#787274] uppercase tracking-wide">Conversion</p>
          </div>
        </div>

        {/* Recent Referrals and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Referrals Table */}
          <div className="lg:col-span-2 bg-[#EDFFD7] rounded-xl overflow-hidden p-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#02383B]">Recent Referrals</h3>
              <Link
                href="/referrer/opportunities"
                className="px-4 py-2 text-sm font-medium text-[#787274] border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">Borrower</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">Loan Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">Property Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#787274] uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {opportunities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#787274]">
                        No referrals found. Create your first referral to get started.
                      </td>
                    </tr>
                  ) : (
                    opportunities.slice(0, 5).map((opp) => (
                      <tr
                        key={opp.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/referrer/opportunities/${opp.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-[#02383B]">{opp.borrowing_entity || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#02383B]">
                          {formatCurrency(opp.loan_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#787274]">
                          {formatAssetType(opp.asset_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`text-white hover:opacity-90 ${
                            opp.status === 'opportunity' ? 'bg-blue-600' :
                            opp.status === 'draft' ? 'bg-gray-500' :
                            opp.status === 'application_created' ? 'bg-purple-600' :
                            opp.status === 'application_submitted' ? 'bg-indigo-600' :
                            opp.status === 'conditionally_approved' ? 'bg-yellow-600' :
                            opp.status === 'approved' ? 'bg-green-600' :
                            opp.status === 'declined' ? 'bg-red-600' :
                            opp.status === 'settled' ? 'bg-teal-600' :
                            opp.status === 'withdrawn' ? 'bg-gray-500' :
                            'bg-[#1a3a3a]'
                          }`}>
                            {opp.status === 'opportunity' ? 'Submitted' :
                             opp.status === 'application_created' ? 'App Created' :
                             opp.status === 'application_submitted' ? 'App Submitted' :
                             opp.status === 'conditionally_approved' ? 'Cond. Approved' :
                             opp.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#787274]">
                          {formatDate(opp.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-10">
            <h3 className="text-xl font-semibold text-[#02383B] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/referrer/pre-assessment"
                className="flex items-center justify-between w-full px-4 py-3 bg-white text-[#787274] rounded-lg border border-gray-200 hover:bg-[#02383B] hover:text-white hover:border-[#02383B] transition-colors font-medium"
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  Pre-Qualify Client
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>

              <Link
                href="/referrer/opportunities/add"
                className="flex items-center justify-between w-full px-4 py-3 bg-white text-[#787274] rounded-lg border border-gray-200 hover:bg-[#02383B] hover:text-white hover:border-[#02383B] transition-colors font-medium"
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  New Lead
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>

              <Link
                href="/referrer/clients"
                className="flex items-center justify-between w-full px-4 py-3 bg-white text-[#787274] rounded-lg border border-gray-200 hover:bg-[#02383B] hover:text-white hover:border-[#02383B] transition-colors font-medium"
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  Add Contact
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>

              <button
                className="flex items-center justify-between w-full px-4 py-3 bg-white text-[#787274] rounded-lg border border-gray-200 hover:bg-[#02383B] hover:text-white hover:border-[#02383B] transition-colors font-medium"
                onClick={() => toast({ title: 'Coming Soon', description: 'Report generation will be available soon.' })}
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  Generate Report
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
