'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

const PAGE_SIZE = 20;

export default function CommissionsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const role = normalizeRole(admin?.role);

  const load = async (targetPage: number = page) => {
    try {
      setError('');
      setLoadingRows(true);
      const data = await get(`/commissions?page=${targetPage}&limit=${PAGE_SIZE}`);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      const nextPages = Math.max(1, Number(data?.pagination?.pages || 1));
      setPages(nextPages);
      setTotal(Math.max(0, Number(data?.total || 0)));
      if (targetPage > nextPages) {
        setPage(nextPages);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('Failed to load commissions'));
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
    load(page);
  }, [get, isLoading, page, router, token]);

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
    let marketerPending = 0;
    let marketerReceived = 0;
    let upstreamPending = 0;
    let upstreamReceived = 0;

    for (const row of rows) {
      const amount = Number(row?.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const isReceived = Boolean(row?.receiverMarkedReceivedAt);
      const channel = String(row?.channel || '');

      if (isReceived) {
        received += amount;
        if (channel === 'marketer') {
          marketerReceived += amount;
        } else if (channel === 'owner' || channel === 'main_merchant') {
          upstreamReceived += amount;
        }
      } else {
        pending += amount;
        if (channel === 'marketer') {
          marketerPending += amount;
        } else if (channel === 'owner' || channel === 'main_merchant') {
          upstreamPending += amount;
        }
      }
    }

    return {
      pending,
      received,
      marketerPending,
      marketerReceived,
      upstreamPending,
      upstreamReceived,
    };
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
      await load(page);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('Failed to update transfer status'));
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('Commission Transfers')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Mark commission payments and receipts. Receiving is enabled only after sender marks paid.')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link href="/admin/notifications">
              <Button variant="outline" className="w-full sm:w-auto">{t('Notifications')}</Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">{t('Back to dashboard')}</Button>
            </Link>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{t(error)}</p>}

        {isSubmerchantRole(role) && admin.mainMerchantId ? (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Payable to marketers')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.marketerPending.toFixed(2)} EGP</p>
            </Card>
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Paid to marketers')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.marketerReceived.toFixed(2)} EGP</p>
            </Card>
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Payable to main merchant (incl. owner share)')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.upstreamPending.toFixed(2)} EGP</p>
            </Card>
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Paid to main merchant (incl. owner share)')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.upstreamReceived.toFixed(2)} EGP</p>
            </Card>
          </div>
        ) : (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Pending commissions')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.pending.toFixed(2)} EGP</p>
            </Card>
            <Card className="rounded-3xl border-stone-200 p-5">
              <p className="text-sm text-stone-500">{t('Received commissions')}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{summary.received.toFixed(2)} EGP</p>
            </Card>
          </div>
        )}

        <Card className="rounded-3xl border-stone-200 p-6">
          {loadingRows ? (
            <p className="text-sm text-muted-foreground">{t('Loading commissions...')}</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No commission records yet.')}</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((orderRows) => {
                const header = orderRows[0];
                return (
                  <div key={header.orderId} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-stone-900">{header.orderNumber}</p>
                        <p className="text-xs text-stone-500">{t('Status')}: {t(String(header.orderStatus || '').toLowerCase())}</p>
                      </div>
                      <Link href={header.href || `/admin/orders/${header.orderId}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">{t('Open order')}</Button>
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
                                <p className="font-medium text-foreground capitalize">{t(String(row.channel).replace('_', ' '))}</p>
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
                                  {receiverReceived ? t('Received') : senderPaid ? t('Paid, pending receive') : t('Pending payment')}
                                </span>
                                {row.canMarkPaid && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={savingKey === `${row.orderId}:${row.channel}:mark_paid`}
                                    onClick={() => updateTransfer(row.orderId, row.channel, 'mark_paid')}
                                  >
                                    {savingKey === `${row.orderId}:${row.channel}:mark_paid` ? t('Saving...') : t('Mark paid')}
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
                                      {savingKey === `${row.orderId}:${row.channel}:mark_received` ? t('Saving...') : t('Mark received')}
                                    </Button>
                                    <Link href={`/admin/commission-complaints/new?orderId=${row.orderId}&channel=${row.channel}`}>
                                      <Button size="sm" variant="outline" className="w-full sm:w-auto">{t("Didn't receive")}</Button>
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
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t('Page')} {Math.min(page, pages)} {t('of')} {pages} · {total} {t('Orders')}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loadingRows}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t('Previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pages || loadingRows}
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
