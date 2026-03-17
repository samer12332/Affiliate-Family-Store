'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DashboardData {
  totalOrders: number;
  totalProducts: number;
  totalMerchants: number;
  totalMarketers: number;
  totalShippingSystems: number;
  visibleDues?: number;
  payableToMarketers?: number;
  ownerCommissionDue?: number;
  totalCommissions?: number;
  statusCounts: Record<string, number>;
  recentOrders: Array<any>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { admin, token, isLoading, logout } = useAdminAuth();
  const { get } = useApi();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    if (admin?.role === 'marketer') {
      router.push('/merchant-directory');
      return;
    }

    get('/admin/dashboard')
      .then(setData)
      .catch((error) => console.error('[v0] Failed to load dashboard', error));
  }, [admin?.role, get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  const nav =
    admin.role === 'marketer'
      ? [
          { href: '/admin/orders', label: 'My orders' },
          { href: '/merchant-directory', label: 'Merchant pages' },
        ]
      : admin.role === 'super_admin'
        ? [
            { href: '/admin/users', label: 'Users' },
            { href: '/admin/orders', label: 'All orders' },
          ]
        : [
            { href: '/admin/products', label: 'Products' },
            { href: '/admin/orders', label: 'Orders' },
            { href: '/admin/shipping-systems', label: 'Shipping' },
            { href: '/admin/users', label: 'Users' },
          ];

  const cards =
    admin.role === 'marketer'
      ? [
          { label: 'My orders', value: data?.totalOrders ?? 0 },
          { label: 'Delivered dues', value: `${Number(data?.visibleDues || 0).toFixed(2)} EGP` },
          { label: 'Delivered', value: data?.statusCounts?.delivered ?? 0 },
        ]
      : admin.role === 'merchant'
        ? [
            { label: 'Merchant orders', value: data?.totalOrders ?? 0 },
            { label: 'My products', value: data?.totalProducts ?? 0 },
            { label: 'Payable to marketers', value: `${Number(data?.payableToMarketers || 0).toFixed(2)} EGP` },
            { label: 'Owner commission due', value: `${Number(data?.ownerCommissionDue || 0).toFixed(2)} EGP` },
          ]
        : [
            { label: 'Orders', value: data?.totalOrders ?? 0 },
            { label: 'Products', value: data?.totalProducts ?? 0 },
            { label: 'Merchants', value: data?.totalMerchants ?? 0 },
            { label: 'Marketers', value: data?.totalMarketers ?? 0 },
            ...(admin.role === 'owner'
              ? [{ label: 'Owner commissions', value: `${Number(data?.totalCommissions || 0).toFixed(2)} EGP` }]
              : []),
          ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{admin.role.replace('_', ' ')}</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Welcome, {admin.name}</h1>
            <p className="mt-1 text-sm text-stone-600">{admin.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.push('/admin/login');
            }}
          >
            Logout
          </Button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="outline">{item.label}</Button>
            </Link>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="rounded-3xl border-stone-200 p-6">
              <p className="text-sm text-stone-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-stone-900">{card.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Status counts</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(data?.statusCounts || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span className="capitalize text-stone-700">{status}</span>
                  <span className="font-semibold text-stone-900">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Recent orders</h2>
            <div className="mt-4 space-y-3">
              {(data?.recentOrders || []).length === 0 ? (
                <p className="text-sm text-stone-500">No orders yet.</p>
              ) : (
                data?.recentOrders?.map((order) => (
                  <Link key={order._id} href={`/admin/orders/${order._id}`}>
                    <div className="rounded-2xl bg-stone-50 px-4 py-3 transition hover:bg-stone-100">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                        <p className="capitalize text-stone-600">{order.status}</p>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">{order.customer?.name}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
