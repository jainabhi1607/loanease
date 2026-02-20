'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, UserPlus, Shield, Users, ShieldCheck, Clock, Send, Mail, Edit, AlertTriangle } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleDisplay: string;
  twoFactorEnabled: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  isInvitation?: boolean;
  expiresAt?: string;
  token?: string;
}

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin_team'
  });
  
  useEffect(() => {
    fetchAdminUsers();
  }, []);
  
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      console.log('Fetching admin users...');
      const response = await fetch('/api/admin/users');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      setAdminUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load admin users';
      setError(errorMessage);
      // Also show toast for better visibility
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return formatDate(dateString);
  };
  
  const handleResendInvitation = async (user: AdminUser) => {
    if (!user.token) {
      toast({
        title: "Error",
        description: "Cannot resend invitation - missing token",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // TODO: Implement resend invitation API endpoint
      const response = await fetch('/api/admin/users/resend-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: user.id,
          email: user.email
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }
      
      toast({
        title: "Success",
        description: `Invitation resent to ${user.email}`,
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteAdmin = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const endpoint = userToDelete.isInvitation 
        ? `/api/admin/users/invitation/${userToDelete.id}`
        : `/api/admin/users/${userToDelete.id}`;
        
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user');
      }
      
      toast({
        title: "Success",
        description: userToDelete.isInvitation 
          ? `Invitation for ${userToDelete.email} has been cancelled.`
          : `Admin access for ${userToDelete.email} has been removed.`,
      });
      
      // Refresh the admin users list
      fetchAdminUsers();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to remove user',
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!formData.email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add administrator');
      }
      
      toast({
        title: "Success",
        description: "Invitation sent successfully. The administrator will receive an email to set up their account with 2FA enabled.",
      });
      
      setIsAddModalOpen(false);
      setFormData({
        email: '',
        role: 'admin_team'
      });
      
      // Refresh the admin users list
      fetchAdminUsers();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add administrator',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/admin/settings">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#02383B] flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Loanease administrator accounts and permissions
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Administrator
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="grid gap-6">
        {/* Admin users section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Administrators
            </CardTitle>
            <CardDescription>
              Users with full access to the Loanease system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4">Loading administrators...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p>{error}</p>
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No administrators configured yet.</p>
                <p className="text-sm mt-2">Click &quot;Add Administrator&quot; to add your first admin user.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'super_admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {user.role === 'super_admin' && <ShieldCheck className="h-3 w-3" />}
                            {user.roleDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.status === 'invited' ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <Mail className="h-3 w-3 mr-1" />
                              Invited
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.twoFactorEnabled ? (
                            <Badge variant="secondary" className="text-green-600">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {formatLastLogin(user.lastLoginAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.isInvitation ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleResendInvitation(user)}
                                  title="Resend Invitation"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title="Cancel Invitation"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <TrashIcon size={16} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.role !== 'super_admin' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    title="Remove Admin Access"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <TrashIcon size={16} />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Administrator Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Administrator</DialogTitle>
              <DialogDescription>
                Send an invitation to a new administrator. They will receive an email to complete their registration with mandatory 2FA enabled.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="col-span-3"
                  placeholder="admin@example.com"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin_team">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddAdmin}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Recent login activity and administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to display.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.isInvitation ? (
                <>
                  Are you sure you want to cancel the invitation for{' '}
                  <span className="font-semibold">{userToDelete?.email}</span>?
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to remove admin access for{' '}
                  <span className="font-semibold">{userToDelete?.email}</span>?
                  They will immediately lose access to the admin portal.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}