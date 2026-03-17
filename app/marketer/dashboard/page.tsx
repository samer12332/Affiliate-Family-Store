'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function MarketerDashboardPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    if (isSubmerchantRole(normalizeRole(admin?.role))) {
      router.push('/admin/dashboard');
      return;
    }

    get('/admin/dashboard')
      .then(setData)
      .catch((error) => console.error('[v0] Failed to load marketer dashboard', error));
  }, [admin?.role, get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Marketer dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Your commission snapshot</h1>
            <p className="mt-2 text-sm text-stone-600">Delivered dues are only visible after the merchant marks the order as delivered.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/merchant-directory"><Button variant="outline">Marketplace</Button></Link>
            <Link href="/cart"><Button variant="outline">Cart</Button></Link>
            <Link href="/admin/commissions"><Button variant="outline">Commissions</Button></Link>
            <Link href="/admin/notifications"><Button variant="outline">Notifications</Button></Link>
            <Link href="/admin/orders"><Button>My orders</Button></Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Total orders</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{data?.totalOrders ?? 0}</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Visible dues</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{Number(data?.visibleDues || 0).toFixed(2)} EGP</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Pending</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{data?.statusCounts?.pending ?? 0}</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Delivered</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{data?.statusCounts?.delivered ?? 0}</p>
          </Card>
        </div>

        <Card className="mt-8 rounded-3xl border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Recent order activity</h2>
          <div className="mt-4 space-y-3">
            {(data?.recentOrders || []).length === 0 ? (
              <p className="text-sm text-stone-500">No orders yet.</p>
            ) : (
              data.recentOrders.map((order: any) => (
                <div key={order._id} className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusPill status={order.status} />
                      <OrderUpdatePill order={order} role="marketer" />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{order.customer?.name}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
