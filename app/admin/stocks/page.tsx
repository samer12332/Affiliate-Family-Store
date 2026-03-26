'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { isAdminRole, isMainMerchantRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

interface StockItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  stock: number;
  availabilityStatus: string;
  merchant: { id: string; name: string; email: string } | null;
}

export default function StocksPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const [items, setItems] = useState<StockItem[]>([]);
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState('');
  const [search, setSearch] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, pages: 1, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
  }, [isLoading, router, token]);

  useEffect(() => {
    if (isLoading || !token) return;

    const query = new URLSearchParams();
    query.set('limit', '20');
    query.set('page', String(page));
    if (search.trim()) query.set('search', search.trim());
    if (merchantId) query.set('merchantId', merchantId);

    setError('');
    get(`/stocks?${query.toString()}`)
      .then((data) => {
        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setItems(nextItems);
        setPagination({
          page: Number(data?.pagination?.page || 1),
          limit: Number(data?.pagination?.limit || 20),
          pages: Number(data?.pagination?.pages || 1),
          total: Number(data?.total || 0),
        });
        setDraftStock((prev) => {
          const next = { ...prev };
          for (const item of nextItems) {
            if (next[item.id] === undefined) {
              next[item.id] = String(item.stock);
            }
          }
          return next;
        });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load stock list'));
  }, [get, isLoading, merchantId, page, search, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  if (!isAdminRole(role) && !isSubmerchantRole(role) && !isMainMerchantRole(role)) {
    router.push('/admin/dashboard');
    return null;
  }

  const merchantOptions = Array.from(
    new Map(
      items
        .filter((item) => item.merchant?.id)
        .map((item) => [item.merchant!.id, item.merchant!])
    ).values()
  );

  const saveStock = async (item: StockItem) => {
    const parsed = Number(draftStock[item.id]);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError(`Stock for "${item.name}" must be a non-negative integer.`);
      return;
    }

    setError('');
    setSavingId(item.id);
    try {
      const data = await request(`/stocks/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: parsed }),
      });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, stock: Number(data?.item?.stock || parsed) } : entry)));
      setDraftStock((prev) => ({ ...prev, [item.id]: String(Number(data?.item?.stock || parsed)) }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Failed to update stock for "${item.name}"`);
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stock management</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track and manually adjust product stock quantities.
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>

        <Card className="mb-6 rounded-3xl p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
            <Input
              placeholder="Search by product name, slug or SKU"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
            {!isSubmerchantRole(role) ? (
              <select
                value={merchantId}
                onChange={(event) => {
                  setPage(1);
                  setMerchantId(event.target.value);
                }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All submerchants</option>
                {merchantOptions.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} ({merchant.email})
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch('');
                setMerchantId('');
              }}
            >
              Reset filters
            </Button>
          </div>
        </Card>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <Card className="rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Product</th>
                  {!isSubmerchantRole(role) && <th className="px-4 py-3">Submerchant</th>}
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current stock</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Adjust stock</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border text-sm">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.slug}</p>
                    </td>
                    {!isSubmerchantRole(role) && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.merchant ? `${item.merchant.name} (${item.merchant.email})` : 'N/A'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{item.stock}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.availabilityStatus}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={draftStock[item.id] ?? String(item.stock)}
                          onChange={(event) => setDraftStock((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          className="max-w-[120px]"
                        />
                        <Button
                          variant="outline"
                          disabled={savingId === item.id}
                          onClick={() => saveStock(item)}
                        >
                          {savingId === item.id ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={isSubmerchantRole(role) ? 5 : 6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No products found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {Math.max(1, pagination.pages)} ({pagination.total} products)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
