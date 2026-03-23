import { cn } from '@/lib/utils';

type AppRole = string;

function normalizeStatus(status?: string) {
  return String(status || '').trim().toLowerCase();
}

function getStatusStyles(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (normalized === 'confirmed') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (normalized === 'shipped') return 'bg-violet-100 text-violet-800 border-violet-200';
  if (normalized === 'delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (normalized === 'cancelled') return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-stone-100 text-stone-700 border-stone-200';
}

function getLastChangedAt(order: any): Date | null {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  const lastFromHistory = history.length > 0 ? history[history.length - 1]?.changedAt : null;
  const fallback = order?.updatedAt || order?.createdAt;
  const raw = lastFromHistory || fallback;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeShort(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getAttentionLabel(order: any, role?: AppRole): string | null {
  const status = normalizeStatus(order?.status);
  const normalizedRole = String(role || '').trim().toLowerCase();

  if ((normalizedRole === 'submerchant' || normalizedRole === 'merchant') && status === 'pending') {
    return 'Needs Action';
  }

  if (normalizedRole === 'marketer' && status === 'delivered') {
    return 'Dues Unlocked';
  }

  if (normalizedRole === 'marketer' && status === 'cancelled') {
    return 'Order Closed';
  }

  if ((normalizedRole === 'admin' || normalizedRole === 'owner' || normalizedRole === 'super_admin') && status === 'pending') {
    return 'New';
  }

  return null;
}

export function OrderStatusPill({ status, className }: { status?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
        getStatusStyles(status),
        className
      )}
    >
      {status || 'unknown'}
    </span>
  );
}

export function OrderUpdatePill({ order, role }: { order: any; role?: AppRole }) {
  const lastChangedAt = getLastChangedAt(order);
  const attentionLabel = getAttentionLabel(order, role);

  if (!lastChangedAt && !attentionLabel) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700">
      {attentionLabel || 'Updated'} {lastChangedAt ? `• ${formatRelativeShort(lastChangedAt)}` : ''}
    </span>
  );
}

