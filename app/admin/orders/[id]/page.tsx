'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface OrderItem {
  productName: string;
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
  unitPrice: number;
  shippingFee: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    street: string;
    detailedAddress?: string;
    city: string;
    governorate: string;
    postalCode?: string;
    phone?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
}

const ORDER_STATUSES = [
  'Pending Review',
  'Confirmed with Customer',
  'Sent to Supplier',
  'Supplier Confirmed',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export default function AdminOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await get(`/orders/${id}`);
        const resolved: Order = data?.order ?? data;
        setOrder(resolved);
        setStatus(resolved.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, token, isLoading, router, get]);

  const saveStatus = async () => {
    if (!order) return;
    try {
      setSaving(true);
      const data = await request(`/orders/${order._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const updated: Order = data?.order ?? data;
      setOrder(updated);
      setStatus(updated.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !token) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm">Back to Orders</Button>
          </Link>
          <p className="mt-4 text-destructive">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">Back to Orders</Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">{order.orderNumber}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Order Status</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full sm:max-w-sm px-3 py-2 border border-border rounded-md text-foreground bg-card"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button onClick={saveStatus} disabled={saving}>
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Customer</h2>
          <p className="text-foreground">{order.customer.name}</p>
          <p className="text-muted-foreground text-sm">{order.customer.email}</p>
          <p className="text-muted-foreground text-sm">{order.customer.phone}</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Shipping Address</h2>
          <p className="text-foreground">{order.shippingAddress.street}</p>
          {order.shippingAddress.detailedAddress && (
            <p className="text-foreground">{order.shippingAddress.detailedAddress}</p>
          )}
          <p className="text-muted-foreground text-sm">
            {order.shippingAddress.city}, {order.shippingAddress.governorate}
          </p>
          {order.shippingAddress.postalCode && (
            <p className="text-muted-foreground text-sm">{order.shippingAddress.postalCode}</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Items</h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="border border-border rounded-md p-3">
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity}
                  {item.selectedColor ? ` | Color: ${item.selectedColor}` : ''}
                  {item.selectedSize ? ` | Size: ${item.selectedSize}` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Unit: {Number(item.unitPrice || 0).toFixed(2)} EGP | Shipping: {Number(item.shippingFee || 0).toFixed(2)} EGP
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Totals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{Number(order.subtotal || 0).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground">{Number(order.shippingFee || 0).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-foreground">{Number(order.total || 0).toFixed(2)} EGP</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
