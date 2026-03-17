'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { MerchantNav } from '@/components/admin/merchant-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function NewShippingSystemPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { post } = useApi();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [fees, setFees] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);

  const save = async () => {
    try {
      setError('');
      setSaving(true);

      const governorateFees = Object.entries(fees)
        .filter(([, value]) => value !== '')
        .map(([governorate, fee]) => ({ governorate, fee: Number(fee) }));

      if (!name.trim()) {
        setError('Shipping system name is required.');
        return;
      }

      if (governorateFees.length === 0) {
        setError('Add at least one governorate fee before creating shipping.');
        return;
      }

      await post('/shipping-systems', {
        name,
        notes,
        governorateFees,
        active: true,
      });

      router.push('/admin/shipping-systems');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create shipping system.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create shipping system</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure governorate-based fees on a dedicated page, then return to the shipping list.
            </p>
          </div>
          <Link href="/admin/shipping-systems">
            <Button variant="outline">Back to shipping</Button>
          </Link>
        </div>

        {isSubmerchantRole(role) && <MerchantNav />}

        <Card className="rounded-3xl p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">System name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="System name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="Notes"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {EGYPTIAN_GOVERNORATES.map((governorate) => (
                <label
                  key={governorate}
                  className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm"
                >
                  <span className="min-w-28">{governorate}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fees[governorate] || ''}
                    onChange={(e) => setFees((prev) => ({ ...prev, [governorate]: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Fee"
                  />
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? 'Creating...' : 'Create shipping system'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

