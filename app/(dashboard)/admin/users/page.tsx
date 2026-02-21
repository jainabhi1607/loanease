'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, UserPlus } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AddAdminUserDialog } from '@/components/AddAdminUserDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { Pagination } from '@/components/ui/pagination';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  role: string;
  roleDisplay: string;
  status: string;
  lastLoginAt?: string;
  isInvitation: boolean;
}

function UsersContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users:', data.error);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (id: string) => {
    router.push(`/admin/users/${id}`);
  };

  const openDeleteDialog = (id: string, name: string) => {
    setUserToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Admin access removed successfully',
        });
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchUsers();
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
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'super_admin') return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
    if (role === 'admin_team') return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'active') return 'bg-[#00d169] text-white hover:bg-[#00d169]';
    if (status === 'invited') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    return 'bg-[#FF6467] text-white hover:bg-[#FF6467]';
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortKey) return 0;

    let aValue: any = a[sortKey as keyof User];
    let bValue: any = b[sortKey as keyof User];

    if (sortKey === 'lastLoginAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#02383B]">Admin Users</h1>
          <p className="text-gray-500 mt-1">
            Manage Loanease administrator accounts and permissions.
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Main Users Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Admin Users</h2>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No users found</p>
            <p className="text-sm text-gray-400">
              Click &quot;Add User&quot; to create a new administrator account.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden p-10">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <SortableTableHead
                    label="Name"
                    sortKey="name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Email"
                    sortKey="email"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Mobile No"
                    sortKey="mobile"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Role"
                    sortKey="role"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <SortableTableHead
                    label="Last Login"
                    sortKey="lastLoginAt"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-[#787274]"
                  />
                  <TableHead className="text-[#787274] font-normal text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-semibold">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mobile || user.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getRoleBadgeColor(user.role)}
                      >
                        {user.roleDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusBadgeColor(user.status)}
                      >
                        {user.status === 'active' ? 'Active' : 'Invited'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user.id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.role !== 'super_admin' && !user.isInvitation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user.id, user.name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {sortedUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedUsers.length}
          />
        )}
      </div>

      <AddAdminUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchUsers}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Remove Admin Access"
        description={`Are you sure you want to remove admin access for "${userToDelete?.name}"? They will no longer be able to access the admin portal.`}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}
