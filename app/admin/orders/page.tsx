'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { MerchantNav } from '@/components/admin/merchant-nav';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ORDER_STATUSES } from '@/lib/constants';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function OrdersPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const query = new URLSearchParams();
    if (status) query.set('status', status);
    get(`/orders?${query.toString()}`)
      .then((data) => setOrders(data.orders || []))
      .catch((error) => console.error('[v0] Failed to fetch orders', error));
  }, [get, isLoading, router, status, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orders</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Submerchants control status changes. Marketers can track status and delivered dues.
            </p>
          </div>
          {!isSubmerchantRole(role) && (
            <Link href="/admin/dashboard">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          )}
        </div>

        {isSubmerchantRole(role) && <MerchantNav />}

        <Card className="mb-6 rounded-3xl p-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm md:max-w-xs"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Card>

        <Card className="rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Governorate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Dues</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-border text-sm">
                    <td className="px-4 py-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.customer?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.governorate}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusPill status={order.status} />
                        <OrderUpdatePill order={order} role={role} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{Number(order.total || 0).toFixed(2)} EGP</td>
                    <td className="px-4 py-3 text-foreground">
                      {order.marketerDuesVisible ? `${Number(order.marketerAmount || 0).toFixed(2)} EGP` : 'Hidden until delivered'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order._id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

