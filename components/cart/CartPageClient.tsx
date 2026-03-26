'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CART_IMAGE_SIZE = 96;

export default function CartPageClient() {
  const router = useRouter();
  const { t } = useI18n();
  const { cart, removeItem, updateQuantity, updateSalePrice } = useCart();
  const [error, setError] = useState('');

  const invalidPricingItems = useMemo(
    () => cart.filter((item) => Number(item.salePriceByMarketer || 0) < Number(item.merchantPrice || 0)),
    [cart]
  );
  const canProceedToCheckout = cart.length > 0 && invalidPricingItems.length === 0;

  const groupedCart = useMemo(
    () =>
      cart.reduce<Record<string, typeof cart>>((groups, item) => {
        const key = item.merchantId || 'unknown';
        groups[key] = groups[key] || [];
        groups[key].push(item);
        return groups;
      }, {}),
    [cart]
  );

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t('Marketer cart')}</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">{t('Review your order')}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {t('Cart and checkout allow only one submerchant and one shipping type at a time.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={cart.length === 0}
            onClick={() => {
              if (!canProceedToCheckout) {
                const names = invalidPricingItems
                  .slice(0, 3)
                  .map((item) => item.productName)
                  .join(', ');
                setError(
                  `${t('Cannot proceed: marketer price is below merchant price for')} ${names}${
                    invalidPricingItems.length > 3 ? ` ${t('and more items')}` : ''
                  }.`
                );
                return;
              }
              setError('');
              router.push('/checkout');
            }}
          >
            {t('Proceed to checkout')}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {cart.length === 0 ? (
        <Card className="rounded-3xl border-stone-200 p-10 text-center">
          <h2 className="text-2xl font-semibold text-stone-900">{t('Your cart is empty')}</h2>
          <p className="mt-3 text-sm text-stone-600">{t('Add merchant products from the marketplace to start building orders.')}</p>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t('Merchant')}</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{merchantName}</h2>
                  </div>
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 text-right text-sm">
                    <p className="text-stone-500">{t('Subtotal')}</p>
                    <p className="font-semibold text-stone-900">{subtotal.toFixed(2)} EGP</p>
                    <p className="mt-1 text-stone-500">{t('Expected profit')}: {expectedProfit.toFixed(2)} EGP</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`} className="grid gap-4 rounded-2xl border border-stone-200 p-4 md:grid-cols-[96px_1fr]">
                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-stone-100">
                        <Image
                          src={item.productImage || '/placeholder.jpg'}
                          alt={item.productName}
                          width={CART_IMAGE_SIZE}
                          height={CART_IMAGE_SIZE}
                          className="h-24 w-24 object-cover"
                          sizes="96px"
                          quality={70}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-stone-900">{item.productName}</h3>
                            <p className="text-sm text-stone-500">{t('Merchant price')}: {Number(item.merchantPrice).toFixed(2)} EGP</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => removeItem(item.productId, item.selectedColor, item.selectedSize)}
                          >
                            {t('Remove')}
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
                            {t('Profit')}: {(Math.max(item.salePriceByMarketer - item.merchantPrice, 0) * item.quantity).toFixed(2)} EGP
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
    </>
  );
}
