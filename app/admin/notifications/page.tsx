'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotificationsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const [items, setItems] = useState<any[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loadingItems, setLoadingItems] = useState(true);

  const load = async () => {
    try {
      setLoadingItems(true);
      const data = await get('/notifications?limit=100');
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadTotal(Number(data?.unreadTotal || 0));
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    load();
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="mt-2 text-sm text-muted-foreground">Unread: {unreadTotal}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={async () => {
                await request('/notifications', {
                  method: 'PATCH',
                  body: JSON.stringify({ action: 'read_all' }),
                });
                await load();
              }}
            >
              Mark all read
            </Button>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">Back to dashboard</Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-3xl border-stone-200 p-6">
          {loadingItems ? (
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    item.read ? 'border-stone-200 bg-white' : 'border-blue-200 bg-blue-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {!item.read && <span className="text-xs font-semibold text-blue-700">New</span>}
                  </div>
                  {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        if (!item.read) {
                          await request(`/notifications/${item._id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ read: true }),
                          });
                        }
                        router.push(item.href || '/admin/dashboard');
                      }}
                    >
                      Open
                    </Button>
                    {!item.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          await request(`/notifications/${item._id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ read: true }),
                          });
                          await load();
                        }}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
