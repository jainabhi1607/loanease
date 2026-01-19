'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardStats {
  numberOfOpportunities: number;
  numberOfApplications: number;
  totalLoansSettledVolume: number;
  totalLoansSettledUnit: number;
  conversionRatio: string;
}

interface NewOpportunity {
  id: string;
  deal_id: string;
  borrower_name: string;
  referrer_name: string;
  loan_type: string;
  loan_amount: number;
}

interface NewReferrer {
  id: string;
  name: string;
  status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [statistics, setStatistics] = useState<DashboardStats>({
    numberOfOpportunities: 0,
    numberOfApplications: 0,
    totalLoansSettledVolume: 0,
    totalLoansSettledUnit: 0,
    conversionRatio: '0.0',
  });
  const [newOpportunities, setNewOpportunities] = useState<NewOpportunity[]>([]);
  const [newReferrers, setNewReferrers] = useState<NewReferrer[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();

      if (response.ok) {
        setStatistics(data.statistics);
        setNewOpportunities(data.newOpportunities || []);
        setNewReferrers(data.newReferrers || []);
        setCurrentMonth(data.currentMonth || '');
        setUserName(data.userName || 'Admin');
      } else {
        console.error('Failed to fetch dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLoanType = (loanType: string) => {
    if (!loanType) return '-';
    const loanTypeMap: { [key: string]: string } = {
      'construction': 'Construction',
      'lease_doc': 'Lease Doc',
      'low_doc': 'Low Doc',
      'private_short_term': 'Private Short Term',
      'unsure': 'Unsure',
    };
    return loanTypeMap[loanType] || loanType;
  };

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      icon: '/icons/dahsboard-icon-1.png',
      value: statistics.numberOfOpportunities.toString(),
      label: 'NUMBER OF OPPORTUNITIES',
      onClick: () => router.push('/admin/opportunities'),
    },
    {
      icon: '/icons/dahsboard-icon-2.png',
      value: statistics.numberOfApplications.toString(),
      label: 'NUMBER OF APPLICATIONS',
      onClick: () => router.push('/admin/applications'),
    },
    {
      icon: '/icons/dahsboard-icon-3.png',
      value: formatCurrency(statistics.totalLoansSettledVolume),
      label: 'TOTAL LOANS SETTLED (BY VOLUME)',
      onClick: undefined,
    },
    {
      icon: '/icons/dahsboard-icon-4.png',
      value: `${statistics.conversionRatio}%`,
      label: 'OPPORTUNITIES SETTLEMENT CONVERSION',
      onClick: undefined,
    },
    {
      icon: '/icons/dahsboard-icon-5.png',
      value: statistics.totalLoansSettledUnit.toString(),
      label: 'TOTAL LOANS SETTLED (BY UNIT)',
      onClick: undefined,
    },
  ];

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header Card */}
      <div className="bg-[#02383B] rounded-lg p-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {userName}</h1>
          <p className="text-gray-300 text-sm">Welcome back to your Loanease administration portal.</p>
        </div>
        <Button
          onClick={() => router.push('/admin/opportunities/add')}
          className="bg-[#02383B] hover:bg-[#035a5e] text-white border border-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Opportunity
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {statsCards.map((card, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg p-6 flex flex-col items-center text-center ${
              card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
            }`}
            onClick={card.onClick}
          >
            <div className="h-[200px] w-full mb-4 flex items-center justify-center">
              <Image
                src={card.icon}
                alt={card.label}
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <p className="text-3xl font-bold text-[#02383B] mb-2">{card.value}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide h-10 flex items-start justify-center">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Opportunities Table */}
        <div className="lg:col-span-2 bg-[#EDFFD7] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#02383B]">New Opportunities for {currentMonth}</h2>
            <Button
              variant="outline"
              size="sm"
              className="text-sm border-gray-300 hover:bg-white"
              onClick={() => router.push('/admin/opportunities')}
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="font-normal text-[#787274] text-sm">Deal ID</TableHead>
                  <TableHead className="font-normal text-[#787274] text-sm">Borrower Name</TableHead>
                  <TableHead className="font-normal text-[#787274] text-sm">Referrer Name</TableHead>
                  <TableHead className="font-normal text-[#787274] text-sm">Loan Type</TableHead>
                  <TableHead className="font-normal text-[#787274] text-sm">Loan Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newOpportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No new opportunities this month
                    </TableCell>
                  </TableRow>
                ) : (
                  newOpportunities.map((opp) => (
                    <TableRow
                      key={opp.id}
                      className="border-b border-gray-200 hover:bg-white/50 cursor-pointer"
                      onClick={() => router.push(`/admin/opportunities/${opp.id}`)}
                    >
                      <TableCell className="font-bold text-[#02383B]">{opp.deal_id}</TableCell>
                      <TableCell className="text-teal-700">{opp.borrower_name}</TableCell>
                      <TableCell className="text-teal-700">{opp.referrer_name}</TableCell>
                      <TableCell>{formatLoanType(opp.loan_type)}</TableCell>
                      <TableCell className="text-teal-700">{formatCurrency(opp.loan_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* New Referrers Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-[#02383B] mb-4">New Referrer</h2>
          <div className="space-y-3">
            {newReferrers.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No new referrers</p>
            ) : (
              newReferrers.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/referrers/${ref.id}`)}
                >
                  <span className="text-[#02383B]">{ref.name}</span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      ref.status === 'Active'
                        ? 'bg-[#00D169] text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {ref.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
