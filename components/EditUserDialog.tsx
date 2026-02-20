'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  first_name: string;
  surname: string;
  email: string;
  role: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
  isAccountOwner: boolean;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  isAccountOwner
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('referrer_team');

  // Update form fields when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setSurname(user.surname || '');
      setRole(user.role);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName.trim() || !surname.trim()) {
      setError('First name and surname are required');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password && password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          surname: surname.trim(),
          password: password || undefined,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      onSuccess();
      onOpenChange(false);

      // Reset form
      setFirstName('');
      setSurname('');
      setPassword('');
      setConfirmPassword('');
      setRole('referrer_team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user?.first_name} {user?.surname}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Surname"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={isAccountOwner}
              >
                <SelectTrigger id="role" className={isAccountOwner ? 'bg-gray-50' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrer_admin">Admin</SelectItem>
                  <SelectItem value="referrer_team">Team Member</SelectItem>
                </SelectContent>
              </Select>
              {isAccountOwner && (
                <p className="text-xs text-gray-500">Account owner role cannot be changed</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
            </div>

            {/* Confirm Password */}
            {password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFirstName('');
                setSurname('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
