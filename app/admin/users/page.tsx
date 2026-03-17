'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function UsersPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, post, request, delete: deleteRequest } = useApi();
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'merchant',
    storeName: '',
    storeSlug: '',
    phone: '',
  });

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get('/admin/users?limit=200')
      .then((data) => setUsers(data.users || []))
      .catch((error) => console.error('[v0] Failed to fetch users', error));
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  if (!['owner', 'super_admin'].includes(admin.role)) {
    router.push('/admin/dashboard');
    return null;
  }

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = await post('/admin/users', form);
    setUsers((prev) => [data.user, ...prev]);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'merchant',
      storeName: '',
      storeSlug: '',
      phone: '',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Super admins can add merchants and marketers. Protected owner deletion is blocked in both UI and API.
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card className="mb-6 rounded-3xl p-6">
          <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Full name" />
            <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Email" />
            <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Password" />
            <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="merchant">merchant</option>
              <option value="marketer">marketer</option>
              {admin.role === 'owner' && <option value="super_admin">super_admin</option>}
            </select>
            <input value={form.storeName} onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Store name for merchants" />
            <input value={form.storeSlug} onChange={(e) => setForm((prev) => ({ ...prev, storeSlug: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Store slug" />
            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Phone" />
            <Button type="submit">Create user</Button>
          </form>
        </Card>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user._id} className="rounded-3xl p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{user.role}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!user.isProtected && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const data = await request(`/admin/users/${user._id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ active: !user.active }),
                        });
                        setUsers((prev) => prev.map((entry) => (entry._id === user._id ? data.user : entry)));
                      }}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  {!user.isProtected && user._id !== (admin.id || admin._id) && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await deleteRequest(`/admin/users/${user._id}`);
                        setUsers((prev) => prev.filter((entry) => entry._id !== user._id));
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
