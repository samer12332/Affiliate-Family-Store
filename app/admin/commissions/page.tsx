'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function CommissionsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const role = normalizeRole(admin?.role);

  const load = async () => {
    try {
      setError('');
      setLoadingRows(true);
      const data = await get('/commissions');
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load commissions');
    } finally {
      setLoadingRows(false);
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

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const key = row.orderId || 'unknown';
      map.set(key, [...(map.get(key) || []), row]);
    }
    return Array.from(map.values());
  }, [rows]);

  const summary = useMemo(() => {
    let pending = 0;
    let received = 0;
    for (const row of rows) {
      const amount = Number(row?.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (row?.receiverMarkedReceivedAt) {
        received += amount;
      } else {
        pending += amount;
      }
    }
    return { pending, received };
  }, [rows]);

  if (isLoading || !token || !admin) return null;

  const canView =
    isAdminRole(role) || isMainMerchantRole(role) || isSubmerchantRole(role) || isMarketerRole(role);
  if (!canView) {
    router.push('/admin/dashboard');
    return null;
  }

  const updateTransfer = async (
    orderId: string,
    channel: 'owner' | 'main_merchant' | 'marketer',
    action: 'mark_paid' | 'mark_received'
  ) => {
    const tokenKey = `${orderId}:${channel}:${action}`;
    setSavingKey(tokenKey);
    setError('');
    try {
      await request(`/orders/${orderId}/commission-transfer`, {
        method: 'PATCH',
        body: JSON.stringify({ channel, action }),
      });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update transfer status');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Commission Transfers</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mark commission payments and receipts. Receiving is enabled only after sender marks paid.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link href="/admin/notifications">
              <Button variant="outline" className="w-full sm:w-auto">Notifications</Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">Back to dashboard</Button>
            </Link>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border-stone-200 p-5">
            <p className="text-sm text-stone-500">Pending commissions</p>
            <p className="mt-2 text-2xl font-bold text-stone-900">{summary.pending.toFixed(2)} EGP</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-5">
            <p className="text-sm text-stone-500">Received commissions</p>
            <p className="mt-2 text-2xl font-bold text-stone-900">{summary.received.toFixed(2)} EGP</p>
          </Card>
        </div>

        <Card className="rounded-3xl border-stone-200 p-6">
          {loadingRows ? (
            <p className="text-sm text-muted-foreground">Loading commissions...</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission records yet.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((orderRows) => {
                const header = orderRows[0];
                return (
                  <div key={header.orderId} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-stone-900">{header.orderNumber}</p>
                        <p className="text-xs text-stone-500">Status: {header.orderStatus}</p>
                      </div>
                      <Link href={header.href || `/admin/orders/${header.orderId}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">Open order</Button>
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {orderRows.map((row) => {
                        const senderPaid = Boolean(row.senderMarkedPaidAt);
                        const receiverReceived = Boolean(row.receiverMarkedReceivedAt);
                        return (
                          <div key={row.id} className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground capitalize">{String(row.channel).replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {Number(row.amount || 0).toFixed(2)} EGP
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  receiverReceived
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : senderPaid
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {receiverReceived ? 'Received' : senderPaid ? 'Paid, pending receive' : 'Pending payment'}
                                </span>
                                {row.canMarkPaid && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={savingKey === `${row.orderId}:${row.channel}:mark_paid`}
                                    onClick={() => updateTransfer(row.orderId, row.channel, 'mark_paid')}
                                  >
                                    {savingKey === `${row.orderId}:${row.channel}:mark_paid` ? 'Saving...' : 'Mark paid'}
                                  </Button>
                                )}
                                {row.canMarkReceived && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full sm:w-auto"
                                      disabled={savingKey === `${row.orderId}:${row.channel}:mark_received`}
                                      onClick={() => updateTransfer(row.orderId, row.channel, 'mark_received')}
                                    >
                                      {savingKey === `${row.orderId}:${row.channel}:mark_received` ? 'Saving...' : 'Mark received'}
                                    </Button>
                                    <Link href={`/admin/commission-complaints/new?orderId=${row.orderId}&channel=${row.channel}`}>
                                      <Button size="sm" variant="outline" className="w-full sm:w-auto">Didn&apos;t receive</Button>
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
