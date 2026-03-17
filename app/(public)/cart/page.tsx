'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CartPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { cart, removeItem, updateQuantity, updateSalePrice } = useCart();

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    if (admin?.role === 'merchant') {
      router.push('/admin/dashboard');
    }
  }, [admin?.role, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  const groupedCart = cart.reduce<Record<string, typeof cart>>((groups, item) => {
    const key = item.merchantId || 'unknown';
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Marketer cart</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Review your merchant orders</h1>
            <p className="mt-2 text-sm text-stone-600">
              Items are grouped by merchant. At checkout, each merchant group becomes its own order automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/merchant-directory">
              <Button variant="outline">Continue shopping</Button>
            </Link>
            <Link href="/checkout">
              <Button disabled={cart.length === 0}>Proceed to checkout</Button>
            </Link>
          </div>
        </div>

        {cart.length === 0 ? (
          <Card className="rounded-3xl border-stone-200 p-10 text-center">
            <h2 className="text-2xl font-semibold text-stone-900">Your cart is empty</h2>
            <p className="mt-3 text-sm text-stone-600">Add merchant products from the marketplace to start building orders.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCart).map(([merchantId, items]) => {
              const merchantName = items[0]?.merchantName || merchantId;
              const subtotal = items.reduce((sum, item) => sum + item.salePriceByMarketer * item.quantity, 0);
              const expectedProfit = items.reduce(
                (sum, item) => sum + Math.max(item.salePriceByMarketer - item.merchantPrice, 0) * item.quantity,
                0
              );

              return (
                <Card key={merchantId} className="rounded-3xl border-stone-200 p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Merchant</p>
                      <h2 className="mt-1 text-xl font-semibold text-stone-900">{merchantName}</h2>
                    </div>
                    <div className="rounded-2xl bg-stone-50 px-4 py-3 text-right text-sm">
                      <p className="text-stone-500">Subtotal</p>
                      <p className="font-semibold text-stone-900">{subtotal.toFixed(2)} EGP</p>
                      <p className="mt-1 text-stone-500">Expected profit: {expectedProfit.toFixed(2)} EGP</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`} className="grid gap-4 rounded-2xl border border-stone-200 p-4 md:grid-cols-[96px_1fr]">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
                          <Image src={item.productImage || '/placeholder.jpg'} alt={item.productName} fill className="object-cover" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-stone-900">{item.productName}</h3>
                              <p className="text-sm text-stone-500">Merchant price: {Number(item.merchantPrice).toFixed(2)} EGP</p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => removeItem(item.productId, item.selectedColor, item.selectedSize)}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateQuantity(item.productId, item.selectedColor, item.selectedSize, Number(event.target.value || 1))
                              }
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.salePriceByMarketer}
                              onChange={(event) =>
                                updateSalePrice(item.productId, item.selectedColor, item.selectedSize, Number(event.target.value || 0))
                              }
                            />
                            <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                              Profit: {(Math.max(item.salePriceByMarketer - item.merchantPrice, 0) * item.quantity).toFixed(2)} EGP
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
