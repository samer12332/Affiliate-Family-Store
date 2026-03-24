'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 24;
const PRODUCT_IMAGE_SIZES = '(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 25vw';

type MarketplaceProduct = {
  _id: string;
  merchantId: string;
  merchantName?: string;
  images?: string[];
  name: string;
  slug: string;
  description?: string;
  merchantPrice?: number;
  price?: number;
  suggestedCommission?: number | null;
  shippingSystemId?: string;
  stock?: number;
  category?: string;
};

export default function MarketerMarketplaceClient({
  authToken,
  initialProducts,
  initialHasMore,
}: {
  authToken: string;
  initialProducts: MarketplaceProduct[];
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem, getTotalItems } = useCart();
  const [products, setProducts] = useState<MarketplaceProduct[]>(initialProducts);
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const skippedInitialFetch = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchParams.get('focusSearch') !== '1') {
      return;
    }

    const nextFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('focusSearch');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });

    return () => {
      window.cancelAnimationFrame(nextFrame);
    };
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [merchantFilter, categoryFilter, deferredSearch]);

  useEffect(() => {
    if (!skippedInitialFetch.current) {
      skippedInitialFetch.current = true;
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      page: String(page),
      fieldset: 'marketplace',
      includeTotal: 'false',
    });

    if (merchantFilter !== 'all') query.set('merchantId', merchantFilter);
    if (categoryFilter !== 'all') query.set('category', categoryFilter === 'clothes' ? 'Clothes' : 'Shoes');
    if (deferredSearch.trim()) query.set('search', deferredSearch.trim());

    setIsLoadingProducts(true);
    fetch(`/api/products?${query.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(data?.error || `Request failed (${response.status})`));
        }
        return data;
      })
      .then((productsRes) => {
        if (cancelled) return;
        const nextProducts = Array.isArray(productsRes.products) ? productsRes.products : [];
        setProducts((prev) => (page === 1 ? nextProducts : [...prev, ...nextProducts]));
        setHasMore(Boolean(productsRes?.hasMore));
      })
      .catch((error) => {
        if (!cancelled && error?.name !== 'AbortError') {
          console.error('[v0] Failed to load marketplace products', error);
          if (page === 1) {
            setProducts([]);
            setHasMore(false);
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authToken, categoryFilter, deferredSearch, merchantFilter, page]);

  const dedupedMerchants = useMemo(() => {
    const seenIds = new Set<string>();
    const result: Array<{ _id: string; name: string }> = [];

    for (const product of products) {
      const id = String(product?.merchantId || '');
      if (!id || seenIds.has(id)) {
        continue;
      }

      seenIds.add(id);
      result.push({
        _id: id,
        name: String(product?.merchantName || 'Submerchant').trim() || 'Submerchant',
      });
    }

    return result;
  }, [products]);

  const merchantNameMap = useMemo(
    () => new Map(dedupedMerchants.map((merchant) => [merchant._id, merchant.name])),
    [dedupedMerchants]
  );

  const totalCartItems = getTotalItems();

  const showToast = async (type: 'success' | 'error', message: string) => {
    const { toast } = await import('sonner');
    if (type === 'success') {
      toast.success(message);
      return;
    }
    toast.error(message);
  };

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
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/marketer/dashboard">
                <Button size="sm" variant="outline">My dashboard</Button>
              </Link>
              <Link href="/admin/orders">
                <Button size="sm" variant="outline">My orders</Button>
              </Link>
              <Link href="/admin/commissions">
                <Button size="sm" variant="outline">Commissions</Button>
              </Link>
              <Link href="/admin/notifications">
                <Button size="sm" variant="outline">Notifications</Button>
              </Link>
              <Link href="/cart">
                <Button size="sm" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({totalCartItems})
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Card className="mb-6 rounded-3xl border-stone-200 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <Input
              ref={searchInputRef}
              placeholder="Search by product name or SKU"
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
              {dedupedMerchants.map((merchant) => (
                <option key={merchant._id} value={merchant._id}>
                  {merchant.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product, index) => {
            const merchantName = merchantNameMap.get(String(product.merchantId)) || String(product.merchantName || 'Merchant');
            const merchantPrice = Number(product.merchantPrice || product.price || 0);
            const isLikelyLcpImage = index === 0 && page === 1;
            return (
              <Card key={product._id} className="overflow-hidden rounded-2xl border-stone-200 p-0 sm:rounded-[28px]">
                <div className="relative aspect-square bg-stone-100">
                  <Image
                    src={product.images?.[0] || '/placeholder.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes={PRODUCT_IMAGE_SIZES}
                    priority={isLikelyLcpImage}
                    quality={70}
                  />
                </div>
                <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                  <div>
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-stone-500 sm:text-[11px] sm:tracking-[0.18em]">{merchantName}</p>
                    <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-stone-900 sm:text-lg">{product.name}</h2>
                    <p className="mt-1 line-clamp-2 text-[11px] text-stone-600 sm:text-sm">
                      {product.description || 'No description added yet for this product.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-stone-50 px-2 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2">
                    <div>
                      <p className="text-[10px] text-stone-500">Merchant price</p>
                      <p className="text-xs font-semibold text-stone-900 sm:text-sm">{merchantPrice.toFixed(2)} EGP</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-stone-500">Suggested commission</p>
                      <p className="text-xs font-semibold text-stone-900 sm:text-sm">
                        {product.suggestedCommission !== null && product.suggestedCommission !== undefined
                          ? `${Number(product.suggestedCommission).toFixed(2)} EGP`
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <Link className="flex-1" href={`/merchant/${product.merchantId}`}>
                      <Button size="sm" variant="outline" className="w-full px-2 text-xs sm:text-sm">Merchant</Button>
                    </Link>
                    <Button
                      size="sm"
                      className="flex-1 px-2 text-xs sm:text-sm"
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
                          void showToast('error', result.error);
                          return;
                        }

                        void showToast('success', 'Product added to cart');
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

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" disabled={isLoadingProducts} onClick={() => setPage((prev) => prev + 1)}>
              {isLoadingProducts ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
