'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ORDER_STATUSES } from '@/lib/constants';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const { t } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const query = new URLSearchParams();
    if (status) query.set('status', status);
    query.set('page', String(page));
    query.set('limit', String(PAGE_SIZE));
    get(`/orders?${query.toString()}`)
      .then((data) => {
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        const nextPages = Math.max(1, Number(data?.pagination?.pages || 1));
        setPages(nextPages);
        setTotal(Math.max(0, Number(data?.total || 0)));
        if (page > nextPages) {
          setPage(nextPages);
        }
      })
      .catch((error) => console.error('[v0] Failed to fetch orders', error));
  }, [get, isLoading, page, router, status, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('Orders')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Submerchants control status changes. Marketers can track status and delivered dues.')}
            </p>
          </div>
          {!isSubmerchantRole(role) && (
            <Link href="/admin/dashboard">
              <Button variant="outline">{t('Back to dashboard')}</Button>
            </Link>
          )}
        </div>

        <Card className="mb-6 rounded-3xl p-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm md:max-w-xs"
          >
            <option value="">{t('All statuses')}</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </Card>

        <Card className="rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">{t('Order')}</th>
                  <th className="px-4 py-3">{t('Customer')}</th>
                  <th className="px-4 py-3">{t('Governorate')}</th>
                  <th className="px-4 py-3">{t('Status')}</th>
                  <th className="px-4 py-3">{t('Total')}</th>
                  <th className="px-4 py-3">{t('Dues')}</th>
                  <th className="px-4 py-3">{t('Action')}</th>
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
                      {order.marketerDuesVisible ? `${Number(order.marketerAmount || 0).toFixed(2)} EGP` : t('Hidden until delivered')}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order._id}`}>
                        <Button variant="outline" size="sm">{t('View')}</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t('Page')} {Math.min(page, pages)} {t('of')} {pages} - {total} {t('Orders')}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t('Previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              >
                {t('Next')}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}


