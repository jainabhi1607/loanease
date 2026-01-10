'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight } from 'lucide-react';
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
      'private_short_term': 'Private/Short Term',
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

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
        <Button
          onClick={() => router.push('/admin/opportunities/add')}
          className="bg-[#00D37F] hover:bg-[#00b86e] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Opportunity
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {/* Number of Opportunities */}
        <div
          className="bg-[#02383B] text-white rounded-lg p-10 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => router.push('/admin/opportunities')}
        >
          <p className="text-sm font-medium mb-2 h-10">Number of Opportunities</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold">{statistics.numberOfOpportunities}</span>
            <ArrowRight className="h-6 w-6 opacity-70" />
          </div>
        </div>

        {/* Number of Applications */}
        <div
          className="bg-[#02383B] text-white rounded-lg p-10 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => router.push('/admin/applications')}
        >
          <p className="text-sm font-medium mb-2 h-10">Number of Applications</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold">{statistics.numberOfApplications}</span>
            <ArrowRight className="h-6 w-6 opacity-70" />
          </div>
        </div>

        {/* Total Loans Settled (By Volume) */}
        <div className="bg-[#00D37F] text-white rounded-lg p-10">
          <p className="text-sm font-medium mb-2 h-10">Total Loans Settled (By Volume)</p>
          <span className="text-3xl font-bold">{formatCurrency(statistics.totalLoansSettledVolume)}</span>
        </div>

        {/* Settlement Conversion Ratio */}
        <div className="bg-[#a8b8d0] text-gray-800 rounded-lg p-10">
          <p className="text-sm font-medium mb-2 h-10">Opportunities Settlement Conversion Ratio</p>
          <span className="text-4xl font-bold">{statistics.conversionRatio} %</span>
        </div>

        {/* Total Loans Settled (By Unit) */}
        <div className="bg-orange-400 text-white rounded-lg p-10">
          <p className="text-sm font-medium mb-2 h-10">Total Loans Settled (By Unit)</p>
          <span className="text-4xl font-bold">{statistics.totalLoansSettledUnit}</span>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Opportunities Table */}
        <div className="lg:col-span-2 bg-[#EDFFD7] rounded-lg border border-gray-200 p-10">
          <h2 className="font-semibold text-gray-900 mb-6">New Opportunities for {currentMonth}</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-normal text-[#787274]">Deal ID</TableHead>
                  <TableHead className="font-normal text-[#787274]">Borrower Name</TableHead>
                  <TableHead className="font-normal text-[#787274]">Referrer Name</TableHead>
                  <TableHead className="font-normal text-[#787274]">Loan Type</TableHead>
                  <TableHead className="font-normal text-[#787274]">Loan Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newOpportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No new opportunities this month
                    </TableCell>
                  </TableRow>
                ) : (
                  newOpportunities.map((opp) => (
                    <TableRow
                      key={opp.id}
                      className="border-b border-gray-100 hover:bg-white/50 cursor-pointer"
                      onClick={() => router.push(`/admin/opportunities/${opp.id}`)}
                    >
                      <TableCell className="font-medium">{opp.deal_id}</TableCell>
                      <TableCell className="font-semibold">{opp.borrower_name}</TableCell>
                      <TableCell>{opp.referrer_name}</TableCell>
                      <TableCell>{formatLoanType(opp.loan_type)}</TableCell>
                      <TableCell>{formatCurrency(opp.loan_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* New Referrers Table */}
        <div className="bg-white rounded-lg shadow p-10">
          <h2 className="font-semibold text-gray-900 mb-6">New Referrer</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {newReferrers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      No new referrers
                    </TableCell>
                  </TableRow>
                ) : (
                  newReferrers.map((ref) => (
                    <TableRow
                      key={ref.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/referrers/${ref.id}`)}
                    >
                      <TableCell className="font-semibold">{ref.name}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            ref.status === 'Active'
                              ? 'bg-[#00D37F] text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {ref.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
