'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isMainMerchantRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface DashboardData {
  totalOrders: number;
  totalProducts: number;
  totalMerchants: number;
  totalMarketers: number;
  totalMainMerchants?: number;
  totalShippingSystems: number;
  visibleDues?: number;
  visibleDuesPending?: number;
  visibleDuesReceived?: number;
  payableToMarketers?: number;
  payableToMarketersPending?: number;
  payableToMarketersReceived?: number;
  ownerCommissionDue?: number;
  ownerCommissionDuePending?: number;
  ownerCommissionDueReceived?: number;
  mainMerchantCommissionDue?: number;
  mainMerchantCommissionDuePending?: number;
  mainMerchantCommissionDueReceived?: number;
  totalCommissions?: number;
  totalCommissionsPending?: number;
  totalCommissionsReceived?: number;
  totalMainMerchantCommissions?: number;
  totalMainMerchantCommissionsPending?: number;
  totalMainMerchantCommissionsReceived?: number;
  managedSubmerchants?: number;
  managedMarketers?: number;
  submerchantDetails?: Array<any>;
  commissions?: Array<any>;
  mainMerchantCommissions?: Array<any>;
  statusCounts: Record<string, number>;
  recentOrders: Array<any>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    if (normalizeRole(admin?.role) === 'marketer') {
      router.push('/marketer/dashboard');
      return;
    }

    get('/admin/dashboard')
      .then((dashboard) => {
        setData(dashboard);
      })
      .catch((error) => console.error('[v0] Failed to load dashboard', error));
  }, [admin?.role, get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  const cards =
    role === 'marketer'
      ? [
          { label: t('My orders'), value: data?.totalOrders ?? 0, href: '/admin/orders' },
          { label: 'Pending dues', value: `${Number(data?.visibleDuesPending ?? data?.visibleDues ?? 0).toFixed(2)} EGP`, href: '/admin/commissions' },
          { label: 'Received dues', value: `${Number(data?.visibleDuesReceived || 0).toFixed(2)} EGP`, href: '/admin/commissions' },
          { label: 'Delivered', value: data?.statusCounts?.delivered ?? 0, href: '/admin/orders?status=delivered' },
        ]
      : isSubmerchantRole(role)
        ? [
            { label: t('Orders'), value: data?.totalOrders ?? 0, href: '/admin/orders' },
            { label: t('Products'), value: data?.totalProducts ?? 0, href: '/admin/products' },
            { label: 'Payable to marketers (pending)', value: `${Number(data?.payableToMarketersPending ?? data?.payableToMarketers ?? 0).toFixed(2)} EGP`, href: '/admin/commissions' },
            { label: 'Payable to marketers (received)', value: `${Number(data?.payableToMarketersReceived || 0).toFixed(2)} EGP`, href: '/admin/commissions' },
            {
              label: 'System commissions (pending)',
              value: `${(Number(data?.ownerCommissionDuePending ?? data?.ownerCommissionDue ?? 0) + Number(data?.mainMerchantCommissionDuePending ?? data?.mainMerchantCommissionDue ?? 0)).toFixed(2)} EGP`,
              href: '/admin/commissions',
            },
            {
              label: 'System commissions (received)',
              value: `${(Number(data?.ownerCommissionDueReceived || 0) + Number(data?.mainMerchantCommissionDueReceived || 0)).toFixed(2)} EGP`,
              href: '/admin/commissions',
            },
          ]
        : isMainMerchantRole(role)
          ? [
              { label: t('Submerchants'), value: data?.managedSubmerchants ?? 0, href: '/admin/users' },
              { label: t('Marketers'), value: data?.managedMarketers ?? 0, href: '/admin/users' },
              { label: t('Orders'), value: data?.totalOrders ?? 0, href: '/admin/orders' },
              { label: t('Products'), value: data?.totalProducts ?? 0, href: '/admin/products' },
              { label: 'My commissions (pending)', value: `${Number(data?.totalMainMerchantCommissionsPending ?? data?.totalMainMerchantCommissions ?? 0).toFixed(2)} EGP`, href: '/admin/commissions' },
              { label: 'My commissions (received)', value: `${Number(data?.totalMainMerchantCommissionsReceived || 0).toFixed(2)} EGP`, href: '/admin/commissions' },
            ]
        : [
            { label: t('Orders'), value: data?.totalOrders ?? 0, href: '/admin/orders' },
            { label: t('Products'), value: data?.totalProducts ?? 0, href: '/admin/products' },
            { label: t('Submerchants'), value: data?.totalMerchants ?? 0, href: '/admin/users' },
            { label: t('Main merchants'), value: data?.totalMainMerchants ?? 0, href: '/admin/users' },
            { label: t('Marketers'), value: data?.totalMarketers ?? 0, href: '/admin/users' },
            ...(isAdminRole(role)
              ? [
                  { label: 'Owner commissions (pending)', value: `${Number(data?.totalCommissionsPending ?? data?.totalCommissions ?? 0).toFixed(2)} EGP`, href: '/admin/commissions' },
                  { label: 'Owner commissions (received)', value: `${Number(data?.totalCommissionsReceived || 0).toFixed(2)} EGP`, href: '/admin/commissions' },
                ]
              : []),
          ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{role.replace('_', ' ')}</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">{t('Welcome,')} {admin.name}</h1>
            <p className="mt-1 text-sm text-stone-600">{admin.email}</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={`${card.label}-${card.href}`} href={card.href} className="block">
              <Card className="rounded-3xl border-stone-200 p-6 transition hover:border-stone-300 hover:shadow-sm">
                <p className="text-sm text-stone-500">{card.label}</p>
                <p className="mt-3 text-3xl font-bold text-stone-900">{card.value}</p>
              </Card>
            </Link>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <OrderStatusPill status={order.status} />
                          <OrderUpdatePill order={order} role={role} />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">{order.customer?.name}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {isMainMerchantRole(role) && (
          <Card className="mt-8 rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">My submerchants</h2>
            <div className="mt-4 space-y-3">
              {(data?.submerchantDetails || []).length === 0 ? (
                <p className="text-sm text-stone-500">No submerchants assigned yet.</p>
              ) : (
                data?.submerchantDetails?.map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl bg-stone-50 px-4 py-3">
                    <p className="font-semibold text-stone-900">{entry.storeName}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Orders: {entry.orders} | Delivered: {entry.deliveredOrders} | Products: {entry.products}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}


