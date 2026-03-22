'use client';

import Image from 'next/image';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateEmail, validatePhone } from '@/lib/common-validation';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function MerchantPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = use(params);
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, post } = useApi();
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [shippingSystems, setShippingSystems] = useState<any[]>([]);
  const [openShippingByProduct, setOpenShippingByProduct] = useState<Record<string, boolean>>({});
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

    if (isSubmerchantRole(normalizeRole(admin?.role))) {
      router.push('/admin/dashboard');
      return;
    }

    Promise.all([
      get('/admin/users?role=submerchant&limit=100'),
      get(`/products?merchantId=${merchantId}&limit=100&fieldset=marketplace`),
      get(`/shipping-systems?merchantId=${merchantId}&limit=100`),
    ])
      .then(([usersRes, productsRes, shippingRes]) => {
        setMerchant((usersRes.users || []).find((entry: any) => entry._id === merchantId) || null);
        setProducts(productsRes.products || []);
        setShippingSystems(shippingRes.shippingSystems || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load merchant page'));
  }, [admin?.role, get, isLoading, merchantId, router, token]);

  const shippingSystemMap = useMemo(
    () => new Map(shippingSystems.map((system: any) => [String(system._id), system])),
    [shippingSystems]
  );

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

  const toggleProductShipping = (productId: string) => {
    setOpenShippingByProduct((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const submitOrder = async () => {
    try {
      setError('');
      setSaving(true);

      if (chosenItems.length === 0) {
        setError('Select at least one product.');
        return;
      }
      if (!customer.name.trim() || !customer.phone.trim() || !customer.addressLine.trim()) {
        setError('Customer name, phone and address are required.');
        return;
      }
      if (!validatePhone(customer.phone)) {
        setError('Please provide a valid customer phone number.');
        return;
      }
      if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
        setError('Please provide a valid customer email address.');
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Merchant page</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">
            {merchant?.merchantProfile?.storeName || merchant?.name || 'Merchant'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Browse this merchant's products, review shipping terms, and enter the selling price you agreed with the customer before placing the order.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border-stone-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Merchant products</h2>
                <p className="mt-1 text-sm text-stone-500">Compact product cards with product-specific shipping details.</p>
              </div>
              <div className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
                {products.length} products
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const resolvedSizes = Array.isArray(product.sizeWeightChart) && product.sizeWeightChart.length > 0
                  ? product.sizeWeightChart.map((entry: any) => entry.size)
                  : Array.isArray(product.sizes)
                    ? product.sizes
                    : [];
                const resolvedColors = Array.isArray(product.colors)
                  ? product.colors.map((color: any) => (typeof color === 'string' ? color : color?.name || 'Color'))
                  : [];
                const selectedEntry = selectedProducts[product._id] || { quantity: 0, salePriceByMarketer: '' };
                const merchantPrice = Number(product.merchantPrice || product.price || 0);
                const salePrice = Number(selectedEntry.salePriceByMarketer || 0);
                const quantity = Number(selectedEntry.quantity || 0);
                const expectedProfit = Math.max(salePrice - merchantPrice, 0) * quantity;
                const shippingSystem = shippingSystemMap.get(String(product.shippingSystemId || ''));
                const shippingOpen = Boolean(openShippingByProduct[product._id]);
                const shippingFeesCount = Array.isArray(shippingSystem?.governorateFees) ? shippingSystem.governorateFees.length : 0;

                return (
                  <div key={product._id} className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-sm">
                    <div className="relative aspect-square bg-stone-100">
                      <Image
                        src={product.images?.[0] || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                            {product.category}{product.gender ? ` • ${product.gender}` : ''}
                          </p>
                          <h3 className="mt-1 truncate text-[15px] font-semibold text-stone-900">{product.name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-stone-500">Price</p>
                          <p className="text-sm font-semibold leading-none text-stone-900">{merchantPrice.toFixed(2)} EGP</p>
                        </div>
                      </div>

                      <p className="line-clamp-1 text-xs text-stone-600">
                        {product.description || 'No description added yet for this product.'}
                      </p>

                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {resolvedSizes.slice(0, 2).map((size: string) => (
                          <span key={size} className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                            {size}
                          </span>
                        ))}
                        {resolvedSizes.length > 2 ? (
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">+{resolvedSizes.length - 2}</span>
                        ) : null}
                        {resolvedColors.slice(0, 1).map((color: string) => (
                          <span key={color} className="rounded-full border border-stone-200 px-2.5 py-1 font-medium text-stone-700">
                            {color}
                          </span>
                        ))}
                        {resolvedColors.length > 1 ? (
                          <span className="rounded-full border border-stone-200 px-2.5 py-1 font-medium text-stone-700">+{resolvedColors.length - 1}</span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2 text-[11px]">
                        <div>
                          <span className="text-stone-500">Suggested:</span>{' '}
                          <span className="font-semibold text-stone-900">
                            {product.suggestedCommission !== null && product.suggestedCommission !== undefined
                              ? `${Number(product.suggestedCommission).toFixed(2)} EGP`
                              : 'Not set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500">Profit:</span>{' '}
                          <span className="font-semibold text-stone-900">{expectedProfit.toFixed(2)} EGP</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-[68px_1fr] gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={selectedEntry.quantity || ''}
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
                          placeholder="Sell price"
                          value={selectedEntry.salePriceByMarketer || ''}
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
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-stone-200">
                        <button
                          type="button"
                          onClick={() => toggleProductShipping(product._id)}
                          className="flex w-full items-center justify-between gap-3 bg-stone-50 px-3 py-2.5 text-left transition hover:bg-stone-100"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-900">
                              {shippingSystem?.name || 'Shipping system not assigned'}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-500">
                              {shippingSystem?.notes || (shippingSystem ? `${shippingFeesCount} governorates configured` : 'No shipping details yet')}
                            </p>
                          </div>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${shippingOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {shippingOpen && shippingSystem && (
                          <div className="border-t border-stone-200 bg-white">
                            <div className="max-h-44 overflow-auto">
                              <table className="min-w-full text-xs">
                                <thead className="bg-stone-50 text-left text-stone-500">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">Governorate</th>
                                    <th className="px-3 py-2 font-medium">Fee</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(shippingSystem.governorateFees || []).map((entry: any) => (
                                    <tr key={`${product._id}-${entry.governorate}`} className="border-t border-stone-200 text-stone-700">
                                      <td className="px-3 py-2">{entry.governorate}</td>
                                      <td className="px-3 py-2 font-medium text-stone-900">{Number(entry.fee).toFixed(2)} EGP</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="self-start rounded-3xl border-stone-200 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Create order</h2>
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

            <div className="mt-6 space-y-2 rounded-2xl bg-stone-50 p-4 text-sm">
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






