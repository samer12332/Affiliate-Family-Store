'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';

export default function MerchantDirectoryPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get } = useApi();
  const [merchants, setMerchants] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get('/admin/users?role=merchant&limit=100')
      .then((data) => setMerchants(data.users || []))
      .catch((error) => console.error('[v0] Failed to fetch merchants', error));
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground">Merchant Pages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Marketers can enter any merchant page to browse only that merchant&apos;s products and create orders.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {merchants.map((merchant) => (
            <Link key={merchant._id} href={`/merchant/${merchant._id}`}>
              <Card className="h-full rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchant</p>
                <h2 className="mt-3 text-xl font-semibold text-foreground">
                  {merchant.merchantProfile?.storeName || merchant.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{merchant.email}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
