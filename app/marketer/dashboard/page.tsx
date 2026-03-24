import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrderStatusPill, OrderUpdatePill } from '@/components/orders/order-status-indicators';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { connectDB } from '@/lib/db';
import { Notification, Order, User } from '@/lib/models';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { verifyToken } from '@/server/utils/auth';

const DASHBOARD_RECENT_ORDERS_LIMIT = 10;

async function getOrderStatusCounts(orderQuery: Record<string, any>) {
  const rows = await Order.aggregate([
    { $match: orderQuery },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const row of rows || []) {
    const key = String(row?._id || '');
    if (Object.prototype.hasOwnProperty.call(statusCounts, key)) {
      statusCounts[key] = Number(row?.count || 0);
    }
  }

  return statusCounts;
}

async function getMarketerSettlementSummary(marketerId: string) {
  const rows = await Order.aggregate([
    { $match: { marketerId, status: 'delivered' } },
    {
      $lookup: {
        from: 'commissions',
        localField: '_id',
        foreignField: 'orderId',
        as: 'commission',
      },
    },
    { $unwind: { path: '$commission', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: null,
        pending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.marketerAmount', 0] },
                  { $eq: [{ $ifNull: ['$commission.marketerSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.marketerAmount',
              0,
            ],
          },
        },
        received: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.marketerAmount', 0] },
                  { $ne: [{ $ifNull: ['$commission.marketerSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.marketerAmount',
              0,
            ],
          },
        },
      },
    },
  ]);

  const totals = rows?.[0] || {};
  return {
    pending: Number(totals.pending || 0),
    received: Number(totals.received || 0),
  };
}

export default async function MarketerDashboardPage() {
  const authToken = (await cookies()).get('admin-token')?.value || '';
  if (!authToken) {
    redirect('/admin/login');
  }

  const decoded = verifyToken(authToken) as { id?: string } | null;
  if (!decoded?.id) {
    redirect('/admin/login');
  }

  await connectDB();
  const viewer = await User.findById(decoded.id).select('_id role active');
  if (!viewer || !viewer.active) {
    redirect('/admin/login');
  }

  if (isSubmerchantRole(normalizeRole(viewer.role))) {
    redirect('/admin/dashboard');
  }

  const marketerQuery = { marketerId: viewer._id };

  const [recentOrders, totalOrders, statusCounts, settlement, unreadNotifications] = await Promise.all([
    Order.find(marketerQuery)
      .sort({ createdAt: -1 })
      .limit(DASHBOARD_RECENT_ORDERS_LIMIT)
      .select('_id orderNumber status customer.name merchantId marketerId createdAt statusHistory updatedAt')
      .lean(),
    Order.countDocuments(marketerQuery),
    getOrderStatusCounts(marketerQuery),
    getMarketerSettlementSummary(String(viewer._id)),
    Notification.countDocuments({ userId: viewer._id, read: false }),
  ]);

  const data = {
    totalOrders,
    statusCounts,
    recentOrders,
    visibleDuesPending: settlement.pending,
    visibleDuesReceived: settlement.received,
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Marketer dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Your commission snapshot</h1>
            <p className="mt-2 text-sm text-stone-600">Delivered dues are only visible after the merchant marks the order as delivered.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/merchant-directory"><Button size="sm" variant="outline">Marketplace</Button></Link>
            <Link href="/categories/clothes"><Button size="sm" variant="outline">Clothes</Button></Link>
            <Link href="/categories/shoes"><Button size="sm" variant="outline">Shoes</Button></Link>
            <Link href="/cart"><Button size="sm" variant="outline">Cart</Button></Link>
            <Link href="/admin/commissions"><Button size="sm" variant="outline">Commissions</Button></Link>
            <Link href="/admin/notifications">
              <Button size="sm" variant="outline">
                {`Notifications${unreadNotifications > 0 ? ` (${Math.min(unreadNotifications, 99)}${unreadNotifications > 99 ? '+' : ''})` : ''}`}
              </Button>
            </Link>
            <Link href="/admin/orders"><Button size="sm">My orders</Button></Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Total orders</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{data.totalOrders}</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Pending dues</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {Number(data.visibleDuesPending).toFixed(2)} EGP
            </p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Received dues</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{Number(data.visibleDuesReceived).toFixed(2)} EGP</p>
          </Card>
          <Card className="rounded-3xl border-stone-200 p-6">
            <p className="text-sm text-stone-500">Pending orders</p>
            <p className="mt-3 text-3xl font-bold text-stone-900">{data.statusCounts?.pending ?? 0}</p>
          </Card>
        </div>

        <Card className="mt-8 rounded-3xl border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Recent order activity</h2>
          <div className="mt-4 space-y-3">
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-stone-500">No orders yet.</p>
            ) : (
              data.recentOrders.map((order: any) => (
                <div key={String(order._id)} className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusPill status={order.status} />
                      <OrderUpdatePill order={order} role="marketer" />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{order.customer?.name}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

