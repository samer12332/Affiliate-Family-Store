'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { toast } from 'sonner';

export default function MerchantDirectoryPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const { addItem, getTotalItems } = useCart();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

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
      get('/admin/users?role=submerchant&limit=200'),
      get('/products?limit=200'),
    ])
      .then(([usersRes, productsRes]) => {
        setMerchants(usersRes.users || []);
        setProducts(productsRes.products || []);
      })
      .catch((error) => console.error('[v0] Failed to load marketer marketplace', error));
  }, [admin?.role, get, isLoading, router, token]);

  const dedupedMerchants = useMemo(() => {
    const seenIds = new Set<string>();
    const result: any[] = [];

    for (const merchant of merchants) {
      const id = String(merchant?._id || '');
      if (!id || seenIds.has(id)) {
        continue;
      }

      seenIds.add(id);
      result.push(merchant);
    }

    return result;
  }, [merchants]);

  const merchantNameMap = useMemo(
    () => new Map(dedupedMerchants.map((merchant) => [merchant._id, merchant.merchantProfile?.storeName || merchant.name])),
    [dedupedMerchants]
  );

  const merchantOptions = useMemo(() => {
    const productMerchantIds = new Set(
      products.map((entry) => String(entry?.merchantId || '')).filter(Boolean)
    );

    return dedupedMerchants.filter((entry) => productMerchantIds.has(String(entry._id)));
  }, [dedupedMerchants, products]);

  const merchantOptionLabel = useMemo(() => {
    const baseLabelCounts = new Map<string, number>();
    for (const merchant of merchantOptions) {
      const base = String(merchant?.merchantProfile?.storeName || merchant?.name || 'Submerchant').trim();
      baseLabelCounts.set(base, (baseLabelCounts.get(base) || 0) + 1);
    }

    const labelMap = new Map<string, string>();
    for (const merchant of merchantOptions) {
      const id = String(merchant?._id || '');
      const base = String(merchant?.merchantProfile?.storeName || merchant?.name || 'Submerchant').trim();
      const email = String(merchant?.email || '').trim();
      const needsDisambiguation = (baseLabelCounts.get(base) || 0) > 1;
      labelMap.set(id, needsDisambiguation && email ? `${base} (${email})` : base);
    }

    return labelMap;
  }, [merchantOptions]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesMerchant = merchantFilter === 'all' || product.merchantId === merchantFilter;
      const matchesCategory = categoryFilter === 'all' || String(product.category || '').toLowerCase() === categoryFilter;
      const merchantName = String(merchantNameMap.get(product.merchantId) || '').toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        String(product.name || '').toLowerCase().includes(normalizedSearch) ||
        String(product.category || '').toLowerCase().includes(normalizedSearch) ||
        merchantName.includes(normalizedSearch);

      return matchesMerchant && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, merchantFilter, merchantNameMap, products, search]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Marketer marketplace</p>
              <h1 className="mt-2 text-3xl font-bold text-stone-900">Browse all submerchant products</h1>
              <p className="mt-2 max-w-3xl text-sm text-stone-600">
                Filter by merchant, build your cart, and confirm orders. Checkout will split the cart into separate merchant orders automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/marketer/dashboard">
                <Button variant="outline">My dashboard</Button>
              </Link>
              <Link href="/admin/orders">
                <Button variant="outline">My orders</Button>
              </Link>
              <Link href="/cart">
                <Button className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({getTotalItems()})
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Card className="mb-6 rounded-3xl border-stone-200 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <Input
              placeholder="Search by product, category, or merchant"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All categories</option>
              <option value="clothes">Clothes</option>
              <option value="shoes">Shoes</option>
            </select>
            <select
              value={merchantFilter}
              onChange={(event) => setMerchantFilter(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All submerchants</option>
              {merchantOptions.map((merchant) => (
                <option key={merchant._id} value={merchant._id}>
                  {merchantOptionLabel.get(String(merchant._id)) || merchant.merchantProfile?.storeName || merchant.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const merchantName = merchantNameMap.get(product.merchantId) || 'Merchant';
            const merchantPrice = Number(product.merchantPrice || product.price || 0);
            return (
              <Card key={product._id} className="overflow-hidden rounded-[28px] border-stone-200 p-0">
                <div className="relative aspect-square bg-stone-100">
                  <Image
                    src={product.images?.[0] || '/placeholder.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{merchantName}</p>
                    <h2 className="mt-1 line-clamp-1 text-lg font-semibold text-stone-900">{product.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                      {product.description || 'No description added yet for this product.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2">
                    <div>
                      <p className="text-[11px] text-stone-500">Merchant price</p>
                      <p className="text-sm font-semibold text-stone-900">{merchantPrice.toFixed(2)} EGP</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-stone-500">Suggested commission</p>
                      <p className="text-sm font-semibold text-stone-900">
                        {product.suggestedCommission !== null && product.suggestedCommission !== undefined
                          ? `${Number(product.suggestedCommission).toFixed(2)} EGP`
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link className="flex-1" href={`/merchant/${product.merchantId}`}>
                      <Button variant="outline" className="w-full">Merchant</Button>
                    </Link>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        const result = addItem({
                          productId: product._id,
                          merchantId: product.merchantId,
                          shippingSystemId: String(product.shippingSystemId || ''),
                          merchantName,
                          productName: product.name,
                          productSlug: product.slug,
                          productImage: product.images?.[0] || '/placeholder.jpg',
                          selectedColor: '',
                          selectedSize: '',
                          quantity: 1,
                          price: merchantPrice,
                          merchantPrice,
                          salePriceByMarketer: merchantPrice,
                          shippingFee: 0,
                          availableStock: Number(product.stock ?? 0),
                        });

                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }

                        toast.success('Product added to cart');
                      }}
                    >
                      Add to cart
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

