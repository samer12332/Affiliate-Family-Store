'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function CheckoutPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { cart, clearCart } = useCart();
  const { post } = useApi();
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', addressLine: '', notes: '' });
  const [governorate, setGovernorate] = useState('Cairo');
  const [shippingByMerchant, setShippingByMerchant] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    if (isSubmerchantRole(normalizeRole(admin?.role))) {
      router.push('/admin/dashboard');
    }
  }, [admin?.role, isLoading, router, token]);

  const merchantGroups = useMemo(() => {
    return Object.entries(
      cart.reduce<Record<string, typeof cart>>((groups, item) => {
        const key = item.merchantId || 'unknown';
        groups[key] = groups[key] || [];
        groups[key].push(item);
        return groups;
      }, {})
    );
  }, [cart]);

  useEffect(() => {
    if (merchantGroups.length === 0) {
      setShippingByMerchant({});
      return;
    }

    Promise.all(
      merchantGroups.map(async ([merchantId, items]) => {
        const data = await post('/orders/shipping-estimate', {
          merchantId,
          governorate,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        });
        return [merchantId, Number(data.shippingFee || 0)] as const;
      })
    )
      .then((entries) => setShippingByMerchant(Object.fromEntries(entries)))
      .catch((estimateError) => setError(estimateError instanceof Error ? estimateError.message : 'Failed to estimate shipping'));
  }, [governorate, merchantGroups, post]);

  if (isLoading || !token || !admin) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.salePriceByMarketer * item.quantity, 0);
  const shippingTotal = Object.values(shippingByMerchant).reduce((sum, value) => sum + Number(value || 0), 0);
  const total = subtotal + shippingTotal;

  const submit = async () => {
    try {
      setError('');
      setSaving(true);

      if (!customer.name || !customer.phone || !customer.addressLine) {
        setError('Customer name, phone, and address are required.');
        return;
      }
      const invalidPricingItems = cart.filter(
        (item) => Number(item.salePriceByMarketer || 0) < Number(item.merchantPrice || 0)
      );
      if (invalidPricingItems.length > 0) {
        const names = invalidPricingItems
          .slice(0, 3)
          .map((item) => item.productName)
          .join(', ');
        setError(
          `Cannot proceed: marketer price is below merchant price for ${names}${
            invalidPricingItems.length > 3 ? ' and more items' : ''
          }.`
        );
        return;
      }

      const createdOrders = [];
      for (const [merchantId, items] of merchantGroups) {
        const response = await post('/orders', {
          merchantId,
          governorate,
          customer,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            salePriceByMarketer: item.salePriceByMarketer,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
          })),
        });
        createdOrders.push(response.order);
      }

      clearCart();
      router.push('/admin/orders');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create merchant orders');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Checkout</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Confirm marketer orders</h1>
            <p className="mt-2 text-sm text-stone-600">Submitting checkout will create one order per merchant from the grouped cart.</p>
          </div>
          <Link href="/cart">
            <Button variant="outline">Back to cart</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Customer details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input placeholder="Customer name" value={customer.name} onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Customer phone" value={customer.phone} onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input placeholder="Customer email" value={customer.email} onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))} />
              <select
                value={governorate}
                onChange={(event) => setGovernorate(event.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {EGYPTIAN_GOVERNORATES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <div className="md:col-span-2">
                <Input placeholder="Address line" value={customer.addressLine} onChange={(event) => setCustomer((prev) => ({ ...prev, addressLine: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <textarea
                  value={customer.notes}
                  onChange={(event) => setCustomer((prev) => ({ ...prev, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Customer notes"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {merchantGroups.map(([merchantId, items]) => (
                <div key={merchantId} className="rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Merchant</p>
                      <h3 className="mt-1 text-lg font-semibold text-stone-900">{items[0]?.merchantName || merchantId}</h3>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-stone-500">Shipping</p>
                      <p className="font-semibold text-stone-900">{Number(shippingByMerchant[merchantId] || 0).toFixed(2)} EGP</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-stone-600">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`} className="flex items-center justify-between gap-4">
                        <span>{item.productName} x {item.quantity}</span>
                        <span>{(item.salePriceByMarketer * item.quantity).toFixed(2)} EGP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="self-start rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Merchant groups</span>
                <span>{merchantGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>{shippingTotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
                <span>Total</span>
                <span>{total.toFixed(2)} EGP</span>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <Button className="mt-6 w-full" disabled={saving || merchantGroups.length === 0} onClick={submit}>
              {saving ? 'Submitting merchant orders...' : 'Confirm checkout'}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}


