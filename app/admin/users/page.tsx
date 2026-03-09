'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminUser {
  _id: string;
  email: string;
  role: 'admin' | 'moderator';
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, post, delete: del, request } = useApi();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'moderator'>('admin');
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await get('/admin/users?limit=100');
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchUsers();
  }, [isLoading, token, router]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const normalizedEmail = newEmail.trim().toLowerCase();
      const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);
      if (exists) {
        setError('User with this email already exists');
        return;
      }

      setCreating(true);
      await post('/admin/users', {
        email: normalizedEmail,
        password: newPassword,
        role: newRole,
        active: newActive,
      });
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      setNewActive(true);
      setSuccess('User created successfully');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (user: AdminUser, payload: any) => {
    setError('');
    setSuccess('');
    try {
      setSavingId(user._id);
      const data = await request(`/admin/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const updated: AdminUser = data.user;
      setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
      setSuccess('User updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    setError('');
    setSuccess('');
    try {
      setSavingId(user._id);
      await del(`/admin/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setSuccess('User deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading || !token) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">Admin Users</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add New User</h2>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              required
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'moderator')}
              className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
            >
              <option value="admin">admin</option>
              <option value="moderator">moderator</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              Active
            </label>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Manage Users</h2>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No admin users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Email</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Role</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Active</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Reset Password</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-border">
                      <td className="py-3 px-2 text-sm text-foreground">{user.email}</td>
                      <td className="py-3 px-2">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((u) =>
                                u._id === user._id ? { ...u, role: e.target.value as 'admin' | 'moderator' } : u
                              )
                            )
                          }
                          className="px-2 py-1 border border-border rounded-md text-sm text-foreground bg-card"
                        >
                          <option value="admin">admin</option>
                          <option value="moderator">moderator</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={user.active}
                            onChange={(e) =>
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u._id === user._id ? { ...u, active: e.target.checked } : u
                                )
                              )
                            }
                          />
                          {user.active ? 'Yes' : 'No'}
                        </label>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="password"
                          placeholder="New password"
                          value={passwordDrafts[user._id] || ''}
                          onChange={(e) =>
                            setPasswordDrafts((prev) => ({ ...prev, [user._id]: e.target.value }))
                          }
                          className="px-2 py-1 border border-border rounded-md text-sm text-foreground bg-card"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={savingId === user._id}
                            onClick={() =>
                              updateUser(user, {
                                role: user.role,
                                active: user.active,
                                ...(passwordDrafts[user._id] ? { password: passwordDrafts[user._id] } : {}),
                              }).then(() =>
                                setPasswordDrafts((prev) => ({ ...prev, [user._id]: '' }))
                              )
                            }
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={savingId === user._id}
                            onClick={() => deleteUser(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
