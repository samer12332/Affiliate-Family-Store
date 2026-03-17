'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get(`/orders/${id}`)
      .then((data) => setOrder(data.order))
      .catch((error) => console.error('[v0] Failed to fetch order', error))
      .finally(() => setLoading(false));
  }, [get, id, isLoading, router, token]);

  if (isLoading || !token || !admin || loading || !order) return null;

  const canChangeStatus =
    admin.role === 'owner' || (admin.role === 'merchant' && order.merchantId === (admin.id || admin._id));

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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{order.orderNumber}</h1>
            <p className="mt-2 capitalize text-muted-foreground">{order.status}</p>
          </div>
          <Link href="/admin/orders">
            <Button variant="outline">Back to orders</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Order items</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item: any) => (
                <div key={`${item.productId}-${item.productSlug}`} className="rounded-2xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <p>Merchant price: {Number(item.merchantPrice || 0).toFixed(2)} EGP</p>
                    <p>Sold price: {Number(item.salePriceByMarketer || 0).toFixed(2)} EGP</p>
                    <p>Marketer profit: {Number(item.marketerProfit || 0).toFixed(2)} EGP</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-muted/40 p-4 text-sm md:grid-cols-2">
              <p>Customer: {order.customer?.name}</p>
              <p>Phone: {order.customer?.phone}</p>
              <p>Governorate: {order.governorate}</p>
              <p>Address: {order.customer?.addressLine}</p>
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Settlement</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{Number(order.subtotal || 0).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{Number(order.shippingFee || 0).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{Number(order.total || 0).toFixed(2)} EGP</span>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <p>Marketer dues: {order.marketerDuesVisible ? `${Number(order.commission?.marketerAmount || 0).toFixed(2)} EGP` : 'Hidden until delivered'}</p>
              {admin.role !== 'marketer' && (
                <>
                  <p>Owner commission: {Number(order.commission?.ownerAmount || 0).toFixed(2)} EGP</p>
                  <p>Merchant net: {Number(order.commission?.merchantNet || 0).toFixed(2)} EGP</p>
                </>
              )}
            </div>

            {canChangeStatus && NEXT_STATUS[order.status]?.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-foreground">Update status</p>
                {NEXT_STATUS[order.status].map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    className="w-full capitalize"
                    disabled={savingStatus === status}
                    onClick={() => updateStatus(status)}
                  >
                    {savingStatus === status ? 'Saving...' : status}
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
