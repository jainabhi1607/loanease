'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { EditAdminUserDialog } from '@/components/EditAdminUserDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  phone: string;
  role: string;
  roleDisplay: string;
  twoFactorEnabled: boolean;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

function UserDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setUserId(id);
    });
  }, [params]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      } else {
        console.error('Failed to fetch user:', data.error);
        toast({
          title: 'Error',
          description: 'Failed to load user details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Admin access removed successfully',
        });
        setDeleteDialogOpen(false);
        router.push('/admin/users');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to remove admin access',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin access',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">User not found</p>
            <Button onClick={() => router.push('/admin/users')}>
              Back to Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/users')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#02383B]">
                    {user.firstName} {user.lastName}
                  </h1>
                  <Badge
                    variant="secondary"
                    className={
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                    }
                  >
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Account
              </Button>
              {user.role !== 'super_admin' && (
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
                >
                  <TrashIcon className="mr-2" size={16} />
                  Delete User
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* General Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">General Information</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">First Name</label>
              <p className="mt-1 text-gray-900">{user.firstName || '-'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Name</label>
              <p className="mt-1 text-gray-900">{user.lastName || '-'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Mobile</label>
            <p className="mt-1 text-gray-900">{user.mobile || '-'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="mt-1 text-gray-900">{user.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={
                    user.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                  }
                >
                  {user.roleDisplay}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                  }
                >
                  {user.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-gray-900">{formatDate(user.createdAt)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Login</label>
              <p className="mt-1 text-gray-900">{formatDate(user.lastLoginAt)}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Two-Factor Authentication</label>
            <div className="mt-1">
              <Badge
                variant="secondary"
                className={
                  user.twoFactorEnabled
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                }
              >
                {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <EditAdminUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={user}
        onSuccess={fetchUser}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Remove Admin Access"
        description={`Are you sure you want to remove admin access for "${user?.firstName} ${user?.lastName}"? They will no longer be able to access the admin portal.`}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading user details...</p>
          </div>
        </div>
      </div>
    }>
      <UserDetailContent params={params} />
    </Suspense>
  );
}
