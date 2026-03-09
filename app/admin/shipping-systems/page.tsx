'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { Plus, Edit2, Trash2 } from 'lucide-react';

type RefusalPolicy =
  | 'ALLOW_REFUSE_ON_FREE_DELIVERY'
  | 'CHARGE_DELIVERY_IF_REFUSED'
  | 'NO_REFUSAL_ALLOWED';

interface ShippingSystem {
  _id: string;
  name: string;
  refusalPolicy: RefusalPolicy;
  notes?: string;
  active: boolean;
  governorateFees: Array<{ governorate: string; fee: number }>;
}

const POLICY_LABELS: Record<RefusalPolicy, string> = {
  ALLOW_REFUSE_ON_FREE_DELIVERY: 'Can refuse without paying anything',
  CHARGE_DELIVERY_IF_REFUSED: 'Charge delivery if order is refused',
  NO_REFUSAL_ALLOWED: 'Customer cannot refuse on delivery',
};

export default function AdminShippingSystemsPage() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, post, put, delete: deleteRequest } = useApi();

  const [systems, setSystems] = useState<ShippingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    refusalPolicy: 'CHARGE_DELIVERY_IF_REFUSED' as RefusalPolicy,
    notes: '',
    active: true,
    governorateEnabled: {} as Record<string, boolean>,
    governorateFees: {} as Record<string, string>,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchSystems = async () => {
      try {
        setLoading(true);
        const data = await get('/shipping-systems');
        setSystems(data.shippingSystems || []);
      } catch (err) {
        console.error('[v0] Failed to fetch shipping systems:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSystems();
  }, [isLoading, token, router, get]);

  const resetForm = () => {
    setFormData({
      name: '',
      refusalPolicy: 'CHARGE_DELIVERY_IF_REFUSED',
      notes: '',
      active: true,
      governorateEnabled: {},
      governorateFees: {},
    });
    setError('');
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (system: ShippingSystem) => {
    const governorateEnabled: Record<string, boolean> = {};
    const governorateFees: Record<string, string> = {};

    for (const feeEntry of system.governorateFees) {
      governorateEnabled[feeEntry.governorate] = true;
      governorateFees[feeEntry.governorate] = String(feeEntry.fee);
    }

    setFormData({
      name: system.name,
      refusalPolicy: system.refusalPolicy,
      notes: system.notes || '',
      active: system.active,
      governorateEnabled,
      governorateFees,
    });
    setError('');
    setEditingId(system._id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const governorateFees = EGYPTIAN_GOVERNORATES
      .filter((gov) => formData.governorateEnabled[gov])
      .map((gov) => ({
        governorate: gov,
        fee: Number(formData.governorateFees[gov] || 0),
      }))
      .filter((entry) => Number.isFinite(entry.fee) && entry.fee >= 0);

    if (governorateFees.length === 0) {
      setError('Select at least one governorate with a valid fee.');
      return;
    }

    const payload = {
      name: formData.name,
      refusalPolicy: formData.refusalPolicy,
      notes: formData.notes,
      active: formData.active,
      governorateFees,
    };

    try {
      if (editingId) {
        const updated = await put(`/shipping-systems/${editingId}`, payload);
        setSystems((prev) =>
          prev.map((item) => (item._id === editingId ? updated.shippingSystem : item))
        );
      } else {
        const created = await post('/shipping-systems', payload);
        setSystems((prev) => [created.shippingSystem, ...prev]);
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shipping system');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequest(`/shipping-systems/${id}`);
      setSystems((prev) => prev.filter((item) => item._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[v0] Failed to delete shipping system:', err);
    }
  };

  if (isLoading || !token) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">Shipping Systems</h1>
          </div>
          <Button onClick={openCreateForm} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            New Shipping System
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading shipping systems...</p>
          ) : systems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No shipping systems found</p>
              <Button onClick={openCreateForm} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Create first shipping system
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systems.map((system) => (
                <div key={system._id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{system.name}</h3>
                      <p className="text-xs text-muted-foreground">{POLICY_LABELS[system.refusalPolicy]}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${system.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {system.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Governorates configured: {system.governorateFees.length}
                  </p>
                  {system.notes && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{system.notes}</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditForm(system)}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(system._id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingId ? 'Edit Shipping System' : 'New Shipping System'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Refusal Policy</label>
                <select
                  value={formData.refusalPolicy}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, refusalPolicy: e.target.value as RefusalPolicy }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                >
                  {Object.entries(POLICY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Governorate Fees</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-md p-3 max-h-64 overflow-y-auto">
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <div key={gov} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.governorateEnabled[gov]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            governorateEnabled: {
                              ...prev.governorateEnabled,
                              [gov]: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span className="text-sm text-foreground min-w-[110px]">{gov}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!formData.governorateEnabled[gov]}
                        value={formData.governorateFees[gov] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            governorateFees: {
                              ...prev.governorateFees,
                              [gov]: e.target.value,
                            },
                          }))
                        }
                        placeholder="Fee"
                        className="w-full px-2 py-1 border border-border rounded-md text-sm bg-card"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Optional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                />
                Active
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-3">Delete Shipping System?</h2>
            <p className="text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
