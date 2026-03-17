'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ProductsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, delete: deleteRequest } = useApi();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get('/products?limit=100')
      .then((data) => setProducts(data.products || []))
      .catch((error) => console.error('[v0] Failed to fetch products', error));
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  if (!['owner', 'merchant'].includes(admin.role)) {
    router.push('/admin/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Merchant products</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Products are now merchant-owned and only appear on that merchant&apos;s page.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link href="/admin/shipping-systems">
              <Button variant="outline">View shipping</Button>
            </Link>
            <Link href="/admin/shipping-systems/new">
              <Button variant="outline">Create shipping</Button>
            </Link>
            <Link href="/admin/products/new">
              <Button>Create new product</Button>
            </Link>
            {admin.role === 'merchant' && (admin.id || admin._id) && (
              <Link href={`/merchant/${admin.id || admin._id}`}>
                <Button variant="outline">Open merchant page</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product._id} className="rounded-3xl p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Merchant price: {Number(product.merchantPrice || product.price || 0).toFixed(2)} EGP
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/products/${product._id}/edit`}>
                    <Button variant="outline">Edit</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await deleteRequest(`/products/${product._id}`);
                      setProducts((prev) => prev.filter((entry) => entry._id !== product._id));
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
