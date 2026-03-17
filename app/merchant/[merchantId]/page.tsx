'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';

export default function MerchantPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = use(params);
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, post } = useApi();
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [shippingSystems, setShippingSystems] = useState<any[]>([]);
  const [governorate, setGovernorate] = useState('Cairo');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', addressLine: '', notes: '' });
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { quantity: number; salePriceByMarketer: string }>>({});
  const [shippingFee, setShippingFee] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    Promise.all([
      get('/admin/users?role=merchant&limit=100'),
      get(`/products?merchantId=${merchantId}&limit=100`),
      get(`/shipping-systems?merchantId=${merchantId}&limit=100`),
    ])
      .then(([usersRes, productsRes, shippingRes]) => {
        setMerchant((usersRes.users || []).find((entry: any) => entry._id === merchantId) || null);
        setProducts(productsRes.products || []);
        setShippingSystems(shippingRes.shippingSystems || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load merchant page'));
  }, [get, isLoading, merchantId, router, token]);

  const chosenItems = useMemo(
    () =>
      products
        .filter((product) => selectedProducts[product._id]?.quantity > 0)
        .map((product) => ({
          productId: product._id,
          quantity: selectedProducts[product._id].quantity,
          salePriceByMarketer: Number(selectedProducts[product._id].salePriceByMarketer || 0),
          selectedColor: '',
          selectedSize: '',
        })),
    [products, selectedProducts]
  );

  useEffect(() => {
    if (!merchantId || chosenItems.length === 0) {
      setShippingFee(0);
      return;
    }

    post('/orders/shipping-estimate', { merchantId, governorate, items: chosenItems })
      .then((data) => setShippingFee(Number(data.shippingFee || 0)))
      .catch(() => setShippingFee(0));
  }, [chosenItems, governorate, merchantId, post]);

  if (isLoading || !token || !admin) return null;

  const submitOrder = async () => {
    try {
      setError('');
      setSaving(true);

      if (chosenItems.length === 0) {
        setError('Select at least one product.');
        return;
      }

      await post('/orders', {
        merchantId,
        governorate,
        customer,
        items: chosenItems,
      });

      router.push('/admin/orders');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchant page</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {merchant?.merchantProfile?.storeName || merchant?.name || 'Merchant'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Marketers only see this merchant&apos;s products here. Shipping settings are visible but read-only.
          </p>
        </div>

        {shippingSystems.length > 0 && (
          <Card className="mb-6 rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Merchant shipping settings</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {shippingSystems.map((system) => (
                <div key={system._id} className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-medium text-foreground">{system.name}</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {system.governorateFees.slice(0, 6).map((entry: any) => (
                      <div key={`${system._id}-${entry.governorate}`} className="flex justify-between">
                        <span>{entry.governorate}</span>
                        <span>{Number(entry.fee).toFixed(2)} EGP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Merchant products</h2>
            <div className="mt-4 space-y-4">
              {products.map((product) => (
                <div key={product._id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Merchant price: {Number(product.merchantPrice || product.price || 0).toFixed(2)} EGP
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={selectedProducts[product._id]?.quantity || ''}
                        onChange={(e) =>
                          setSelectedProducts((prev) => ({
                            ...prev,
                            [product._id]: {
                              quantity: Number(e.target.value || 0),
                              salePriceByMarketer: prev[product._id]?.salePriceByMarketer || '',
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Selling price"
                        value={selectedProducts[product._id]?.salePriceByMarketer || ''}
                        onChange={(e) =>
                          setSelectedProducts((prev) => ({
                            ...prev,
                            [product._id]: {
                              quantity: prev[product._id]?.quantity || 0,
                              salePriceByMarketer: e.target.value,
                            },
                          }))
                        }
                      />
                      <div className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                        Profit:{' '}
                        {(
                          Math.max(
                            Number(selectedProducts[product._id]?.salePriceByMarketer || 0) -
                              Number(product.merchantPrice || product.price || 0),
                            0
                          ) * Number(selectedProducts[product._id]?.quantity || 0)
                        ).toFixed(2)}{' '}
                        EGP
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Create order</h2>
            <div className="mt-4 space-y-3">
              <Input placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Customer phone" value={customer.phone} onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))} />
              <Input placeholder="Customer email" value={customer.email} onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))} />
              <Input placeholder="Address line" value={customer.addressLine} onChange={(e) => setCustomer((prev) => ({ ...prev, addressLine: e.target.value }))} />
              <textarea
                value={customer.notes}
                onChange={(e) => setCustomer((prev) => ({ ...prev, notes: e.target.value }))}
                className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="Customer notes"
              />

              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {EGYPTIAN_GOVERNORATES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-2 rounded-2xl bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span>Items selected</span>
                <span>{chosenItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping fee</span>
                <span>{shippingFee.toFixed(2)} EGP</span>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <Button className="mt-6 w-full" onClick={submitOrder} disabled={saving}>
              {saving ? 'Creating order...' : 'Submit to merchant'}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
