'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Plus, FileText, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (response.ok) {
        // Clear any local storage items
        localStorage.removeItem('rememberMe');
        
        toast({
          title: 'Logged out successfully',
          description: 'You have been logged out of your account.',
        });
        
        // Force reload to clear any cached auth state
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">Loanease - Referrer Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Referrer Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your Loanease referrer portal. Manage your loan opportunities and track their progress.
          </p>
          
          {/* Quick Actions */}
          <div className="mt-8 mb-8">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex gap-4">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Opportunity
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Team
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                View Reports
              </Button>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">Active Opportunities</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">In progress</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">Applications</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Submitted</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">Settlements</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">This month</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">Commission</h3>
              <p className="text-3xl font-bold">₹0</p>
              <p className="text-sm text-muted-foreground">YTD earnings</p>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-center text-muted-foreground">
                No recent activity. Create your first opportunity to get started.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}