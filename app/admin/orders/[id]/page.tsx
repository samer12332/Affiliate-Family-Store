'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

const NEXT_STATUS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const { t } = useI18n();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('');
  const [savingTransfer, setSavingTransfer] = useState('');
  const [transferError, setTransferError] = useState('');

  const loadOrder = async () => {
    try {
      const data = await get(`/orders/${id}`);
      setOrder(data.order);
    } catch (error) {
      console.error('[v0] Failed to fetch order', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadOrder();
  }, [get, id, isLoading, router, token]);

  if (isLoading || !token || !admin || loading || !order) return null;
  const role = normalizeRole(admin.role);
  const marketerDues = Number(order.commission?.marketerAmount || 0);
  const marketerDuesVisible = Boolean(order.marketerDuesVisible);
  const totalSystemCommissions =
    Number(order.commission?.ownerAmount || 0) + Number(order.commission?.mainMerchantAmount || 0);

  const canChangeStatus =
    isAdminRole(role) || (isSubmerchantRole(role) && order.merchantId === (admin.id || admin._id));

  const updateStatus = async (status: string) => {
    setSavingStatus(status);
    try {
      const data = await request(`/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrder({
        ...data.order,
        commission: data.commission
          ? {
              ...(order.commission || {}),
              ...data.commission,
            }
          : order.commission,
      });
    } finally {
      setSavingStatus('');
    }
  };

  const actorId = String(admin.id || admin._id || '');
  const isActorSubmerchant = isSubmerchantRole(role) && String(order.merchantId || '') === actorId;
  const isActorMainMerchant = role === 'main_merchant' && String(order.participants?.mainMerchant?.id || '') === actorId;
  const isActorMarketer = role === 'marketer' && String(order.participants?.marketer?.id || '') === actorId;
  const isActorOwner = isAdminRole(role);

  const transferRows = [
    {
      key: 'owner',
      label: 'Owner commission',
      amount: Number(order.commission?.ownerAmount || 0),
      settlement: order.commission?.settlements?.owner || null,
      canMarkPaid: isActorSubmerchant || isActorMainMerchant,
      canMarkReceived: isActorOwner,
    },
    {
      key: 'main_merchant',
      label: 'Main merchant commission',
      amount: Number(order.commission?.mainMerchantAmount || 0),
      settlement: order.commission?.settlements?.mainMerchant || null,
      canMarkPaid: isActorSubmerchant,
      canMarkReceived: isActorMainMerchant,
    },
    {
      key: 'marketer',
      label: 'Marketer dues',
      amount: Number(order.commission?.marketerAmount || 0),
      settlement: order.commission?.settlements?.marketer || null,
      canMarkPaid: isActorSubmerchant || isActorMainMerchant || isActorOwner,
      canMarkReceived: isActorMarketer,
    },
  ].filter((row) => row.amount > 0);

  const markTransfer = async (channel: 'owner' | 'main_merchant' | 'marketer', action: 'mark_paid' | 'mark_received') => {
    setTransferError('');
    const tokenKey = `${channel}:${action}`;
    setSavingTransfer(tokenKey);
    try {
      await request(`/orders/${id}/commission-transfer`, {
        method: 'PATCH',
        body: JSON.stringify({ channel, action }),
      });
      await loadOrder();
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : t('Failed to update commission transfer status'));
    } finally {
      setSavingTransfer('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{order.orderNumber}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <OrderStatusPill status={order.status} />
              <OrderUpdatePill order={order} role={role} />
            </div>
          </div>
          <Link href="/admin/orders">
            <Button variant="outline">{t('Back to orders')}</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">{t('Order items')}</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item: any) => (
                <div key={`${item.productId}-${item.productSlug}`} className="rounded-2xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{t('Qty')} {item.quantity}</p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <p>{t('Merchant price')}: {Number(item.merchantPrice || 0).toFixed(2)} EGP</p>
                    <p>{t('Sold price')}: {Number(item.salePriceByMarketer || 0).toFixed(2)} EGP</p>
                    <p>{t('Marketer profit')}: {Number(item.marketerProfit || 0).toFixed(2)} EGP</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-muted/40 p-4 text-sm md:grid-cols-2">
              <p>{t('Customer')}: {order.customer?.name}</p>
              <p>{t('Phone')}: {order.customer?.phone}</p>
              <p>{t('Governorate')}: {order.governorate}</p>
              <p>{t('Address')}: {order.customer?.addressLine}</p>
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">{t('Settlement')}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('Subtotal')}</span>
                <span>{Number(order.subtotal || 0).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Shipping')}</span>
                <span>{Number(order.shippingFee || 0).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t('Total')}</span>
                <span>{Number(order.total || 0).toFixed(2)} EGP</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{t('Marketer dues')}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    marketerDuesVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {marketerDuesVisible ? t('Available') : t('Locked')}
                </span>
              </div>
              {marketerDuesVisible ? (
                <p className="mt-2 text-base font-semibold text-foreground">{marketerDues.toFixed(2)} EGP</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>{t('This amount is hidden until the order reaches delivered status.')}</p>
                  <p className="capitalize">{t('Current status')}: {t(String(order.status || '').toLowerCase())}</p>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {role !== 'marketer' && (
                <>
                  {isSubmerchantRole(role) ? (
                    <p>{t('Total system commissions')}: {totalSystemCommissions.toFixed(2)} EGP</p>
                  ) : (
                    <>
                      <p>{t('Owner commission')}: {Number(order.commission?.ownerAmount || 0).toFixed(2)} EGP</p>
                      <p>{t('Main merchant commission')}: {Number(order.commission?.mainMerchantAmount || 0).toFixed(2)} EGP</p>
                    </>
                  )}
                  <p>{t('Merchant net')}: {Number(order.commission?.merchantNet || 0).toFixed(2)} EGP</p>
                </>
              )}
            </div>

            {order.status === 'delivered' ? (
              <div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-sm">
                <p className="font-medium text-foreground">{t('Commission transfers')}</p>
                {transferRows.length === 0 ? (
                  <p className="text-muted-foreground">{t('No payable commission transfers for this order yet.')}</p>
                ) : (
                  transferRows.map((row) => {
                    const senderPaid = Boolean(row.settlement?.senderMarkedPaidAt);
                    const receiverReceived = Boolean(row.settlement?.receiverMarkedReceivedAt);
                    return (
                      <div key={row.key} className="rounded-xl border border-stone-200 bg-white px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{t(row.label)}</p>
                            <p className="text-xs text-muted-foreground">{row.amount.toFixed(2)} EGP</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              receiverReceived ? 'bg-emerald-100 text-emerald-700' : senderPaid ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {receiverReceived ? t('Received') : senderPaid ? t('Paid, pending receive') : t('Pending payment')}
                            </span>
                            {row.canMarkPaid && !senderPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingTransfer === `${row.key}:mark_paid`}
                                onClick={() => markTransfer(row.key as any, 'mark_paid')}
                              >
                                {savingTransfer === `${row.key}:mark_paid` ? t('Saving...') : t('Mark paid')}
                              </Button>
                            )}
                            {row.canMarkReceived && senderPaid && !receiverReceived && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={savingTransfer === `${row.key}:mark_received`}
                                  onClick={() => markTransfer(row.key as any, 'mark_received')}
                                >
                                  {savingTransfer === `${row.key}:mark_received` ? t('Saving...') : t('Mark received')}
                                </Button>
                                <Link href={`/admin/commission-complaints/new?orderId=${id}&channel=${row.key}`}>
                                  <Button size="sm" variant="outline">{t("Didn't receive")}</Button>
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {transferError && <p className="text-destructive">{t(transferError)}</p>}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t('Commission payments are available only after order status becomes delivered.')}
              </div>
            )}

            {(isAdminRole(role) || role === 'main_merchant') && (
              <div className="mt-6 space-y-2 rounded-2xl bg-muted/40 p-4 text-sm">
                <p className="font-medium text-foreground">{t('Order participants')}</p>
                <p>
                  {t('Marketer')}: {order.participants?.marketer?.name || t('N/A')}
                  {order.participants?.marketer?.email ? ` (${order.participants.marketer.email})` : ''}
                </p>
                <p>
                  {t('Submerchant')}: {order.participants?.submerchant?.name || t('N/A')}
                  {order.participants?.submerchant?.email ? ` (${order.participants.submerchant.email})` : ''}
                </p>
                <p>
                  {t('Main merchant')}: {order.participants?.mainMerchant?.name || t('N/A')}
                  {order.participants?.mainMerchant?.email ? ` (${order.participants.mainMerchant.email})` : ''}
                </p>
              </div>
            )}

            {canChangeStatus && NEXT_STATUS[order.status]?.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-foreground">{t('Update status')}</p>
                {NEXT_STATUS[order.status].map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    className="w-full capitalize"
                    disabled={savingStatus === status}
                    onClick={() => updateStatus(status)}
                  >
                    {savingStatus === status ? t('Saving...') : t(status)}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
