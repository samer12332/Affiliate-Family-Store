'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isMainMerchantRole, normalizeRole } from '@/lib/roles';
import { useI18n } from '@/components/i18n/LanguageProvider';

export default function UsersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, post, request, delete: deleteRequest } = useApi();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'submerchant',
    storeName: '',
    storeSlug: '',
    phone: '',
    mainMerchantId: '',
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

  const role = normalizeRole(admin.role);

  if (!isAdminRole(role) && !isMainMerchantRole(role)) {
    router.push('/admin/dashboard');
    return null;
  }

  const mainMerchants = users.filter((entry) => normalizeRole(entry.role) === 'main_merchant');

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isValidEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSaving(true);
      const data = await post('/admin/users', form);
      setUsers((prev) => [data.user, ...prev]);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'submerchant',
        storeName: '',
        storeSlug: '',
        phone: '',
        mainMerchantId: '',
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Main merchants can add their own submerchants and marketers. Admin and owner can manage all users.')}
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">{t('Back')}</Button>
          </Link>
        </div>

        <Card className="mb-6 rounded-3xl p-6">
          <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Full name" />
            <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Email" />
            <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Password" />
            <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              {isMainMerchantRole(role) ? null : <option value="main_merchant">main_merchant</option>}
              <option value="submerchant">submerchant</option>
              <option value="marketer">marketer</option>
              {role === 'owner' && <option value="admin">admin</option>}

            </select>
            <input value={form.storeName} onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Store name for submerchants" />
            <input value={form.storeSlug} onChange={(e) => setForm((prev) => ({ ...prev, storeSlug: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Store slug" />
            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Phone" />
            {!isMainMerchantRole(role) && (form.role === 'submerchant' || form.role === 'marketer') && (
              <select value={form.mainMerchantId} onChange={(e) => setForm((prev) => ({ ...prev, mainMerchantId: e.target.value }))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="">No main merchant (global visibility)</option>
                {mainMerchants.map((entry) => (
                  <option key={entry._id} value={entry._id}>{entry.name}</option>
                ))}
              </select>
            )}
            <Button type="submit" disabled={saving}>{saving ? t('Creating...') : t('Create user')}</Button>
          </form>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </Card>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user._id} className="rounded-3xl p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{normalizeRole(user.role)}</p>
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
                      {t(user.active ? 'Deactivate' : 'Activate')}
                    </Button>
                  )}
                  {!user.isProtected && user._id !== (admin.id || admin._id) && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const confirmed = window.confirm(`Delete ${user.name} (${user.email})?`);
                        if (!confirmed) {
                          return;
                        }

                        try {
                          setError('');
                          setDeletingId(user._id);
                          setUsers((prev) => prev.filter((entry) => entry._id !== user._id));
                          await deleteRequest(`/admin/users/${user._id}`);
                        } catch (deleteError) {
                          setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
                          try {
                            const data = await get('/admin/users?limit=200');
                            setUsers(data.users || []);
                          } catch {
                            // Keep optimistic state if refetch fails; error banner is already shown.
                          }
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={deletingId === user._id}
                    >
                      {deletingId === user._id ? t('Deleting...') : t('Delete')}
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
