'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, normalizeRole } from '@/lib/roles';

export default function CommissionComplaintsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setLoadingComplaints(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      const data = await get(`/commission-complaints?${query.toString()}`);
      setComplaints(Array.isArray(data?.complaints) ? data.complaints : []);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    load();
  }, [get, isLoading, router, statusFilter, token]);

  if (isLoading || !token || !admin) return null;
  if (!isAdminRole(normalizeRole(admin.role))) {
    router.push('/admin/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Commission Complaints</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review complaints submitted by receivers.</p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>

        <Card className="mb-6 rounded-3xl border-stone-200 p-4">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Card>

        <Card className="rounded-3xl border-stone-200 p-6">
          {loadingComplaints ? (
            <p className="text-sm text-muted-foreground">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No complaints found.</p>
          ) : (
            <div className="space-y-4">
              {complaints.map((item) => (
                <div key={item._id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">{item.orderNumber}</p>
                      <p className="text-xs text-stone-500 capitalize">
                        Channel: {String(item.channel || '').replace('_', ' ')} | Status: {item.status}
                      </p>
                    </div>
                    <Link href={`/admin/orders/${item.orderId}`}>
                      <Button variant="outline" size="sm">Open order</Button>
                    </Link>
                  </div>
                  <p className="mt-3 text-sm text-stone-700">{item.message}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Complainant: {item.complainant?.name || 'N/A'} ({item.complainant?.email || 'N/A'})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['open', 'in_review', 'resolved', 'rejected'].map((status) => (
                      <Button
                        key={`${item._id}-${status}`}
                        size="sm"
                        variant="outline"
                        disabled={savingId === `${item._id}:${status}` || item.status === status}
                        onClick={async () => {
                          const tokenKey = `${item._id}:${status}`;
                          setSavingId(tokenKey);
                          try {
                            await request(`/commission-complaints/${item._id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status }),
                            });
                            await load();
                          } finally {
                            setSavingId('');
                          }
                        }}
                      >
                        {savingId === `${item._id}:${status}` ? 'Saving...' : status.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
