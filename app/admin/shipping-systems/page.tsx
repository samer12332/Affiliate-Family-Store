'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdminRole, isMainMerchantRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function ShippingSystemsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, delete: deleteRequest } = useApi();
  const [systems, setSystems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, pages: 1, total: 0 });

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    get(`/shipping-systems?limit=12&page=${page}`)
      .then((data) => {
        setSystems(data.shippingSystems || []);
        setPagination({
          page: Number(data?.pagination?.page || page),
          limit: Number(data?.pagination?.limit || 12),
          pages: Number(data?.pagination?.pages || 1),
          total: Number(data?.total || 0),
        });
      })
      .catch((loadError) => console.error('[v0] Failed to fetch shipping systems', loadError));
  }, [get, isLoading, page, router, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Submerchant shipping</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page only lists shipping systems. Creating and editing now happen on separate pages.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link href="/admin/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">Back to dashboard</Button>
            </Link>
            <Link href="/admin/shipping-systems/new">
              <Button className="w-full sm:w-auto">Create shipping system</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {systems.map((system) => (
            <Card key={system._id} className="rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-foreground">{system.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{system.notes || 'No notes'}</p>
              {(isAdminRole(role) || isMainMerchantRole(role)) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Submerchant: {system.submerchant?.name || 'N/A'}
                  {system.submerchant?.email ? ` (${system.submerchant.email})` : ''}
                </p>
              )}
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {system.governorateFees.slice(0, 6).map((fee: any) => (
                  <div key={`${system._id}-${fee.governorate}`} className="flex justify-between">
                    <span>{fee.governorate}</span>
                    <span>{Number(fee.fee).toFixed(2)} EGP</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href={`/admin/shipping-systems/${system._id}/edit`}>
                  <Button variant="outline" className="w-full sm:w-auto">Edit</Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {Math.max(1, pagination.pages)} ({pagination.total} systems)
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pagination.page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
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

