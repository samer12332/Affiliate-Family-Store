'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function NewCommissionComplaintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, token, isLoading } = useAdminAuth();
  const { post } = useApi();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const orderId = String(searchParams.get('orderId') || '').trim();
  const channel = String(searchParams.get('channel') || '').trim();
  const role = normalizeRole(admin?.role);
  const canUsePage =
    isAdminRole(role) || isMainMerchantRole(role) || isSubmerchantRole(role) || isMarketerRole(role);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
  }, [isLoading, router, token]);

  if (isLoading || !token || !admin) return null;
  if (!canUsePage) {
    router.push('/admin/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Report payment issue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This complaint will be sent to system owner/admin for review.
            </p>
          </div>
          <Link href="/admin/commissions">
            <Button variant="outline">Back to commissions</Button>
          </Link>
        </div>

        <Card className="rounded-3xl border-stone-200 p-6">
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <p><strong>Order:</strong> {orderId || 'N/A'}</p>
              <p><strong>Channel:</strong> {channel ? channel.replace('_', ' ') : 'N/A'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Complaint details</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="Explain what happened and any proof/details."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              disabled={saving}
              onClick={async () => {
                try {
                  setError('');
                  setSaving(true);
                  if (!orderId || !channel) {
                    setError('Missing order/channel information.');
                    return;
                  }
                  if (!message.trim()) {
                    setError('Please provide complaint details.');
                    return;
                  }
                  await post('/commission-complaints', {
                    orderId,
                    channel,
                    message,
                  });
                  router.push('/admin/commissions');
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : 'Failed to submit complaint');
                } finally {
                  setSaving(false);
                }
              }}
              className="w-full"
            >
              {saving ? 'Submitting...' : 'Submit complaint'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
