'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ShippingSystemsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, delete: deleteRequest } = useApi();
  const [systems, setSystems] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get('/shipping-systems?limit=100')
      .then((data) => setSystems(data.shippingSystems || []))
      .catch((loadError) => console.error('[v0] Failed to fetch shipping systems', loadError));
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Merchant shipping</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page only lists shipping systems. Creating and editing now happen on separate pages.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard">
              <Button variant="outline">Back</Button>
            </Link>
            <Link href="/admin/shipping-systems/new">
              <Button>Create shipping system</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {systems.map((system) => (
            <Card key={system._id} className="rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-foreground">{system.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{system.notes || 'No notes'}</p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {system.governorateFees.slice(0, 6).map((fee: any) => (
                  <div key={`${system._id}-${fee.governorate}`} className="flex justify-between">
                    <span>{fee.governorate}</span>
                    <span>{Number(fee.fee).toFixed(2)} EGP</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/admin/shipping-systems/${system._id}/edit`}>
                  <Button variant="outline">Edit</Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteRequest(`/shipping-systems/${system._id}`);
                    setSystems((prev) => prev.filter((entry) => entry._id !== system._id));
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
