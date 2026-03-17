import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { OWNER_COMMISSION_RATE } from '@/lib/constants';
import { Commission, Order } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

const STATUS_FLOW = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function canTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'cancelled' || currentStatus === 'delivered') return false;
  if (nextStatus === 'cancelled') return true;

  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const nextIndex = STATUS_FLOW.indexOf(nextStatus);
  return nextIndex === currentIndex + 1;
}

async function ensureCommissionForOrder(order: any) {
  const marketerAmount = order.items.reduce(
    (sum: number, item: any) => sum + Number(item.marketerProfit || 0),
    0
  );
  const ownerAmount = Number(order.subtotal || 0) * OWNER_COMMISSION_RATE;
  const merchantNet = Math.max(Number(order.subtotal || 0) - ownerAmount - marketerAmount, 0);

  const commission = await Commission.findOneAndUpdate(
    { orderId: order._id },
    {
      ownerAmount,
      marketerAmount,
      merchantNet,
      status: order.status === 'delivered' ? 'delivered' : 'confirmed',
    },
    { new: true, upsert: true }
  );

  return commission;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (auth.user.role === 'merchant' && order.merchantId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (auth.user.role === 'marketer' && order.marketerId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const commission = await Commission.findOne({ orderId: order._id });
    const canSeeDues =
      order.status === 'delivered' ||
      ['merchant', 'owner', 'super_admin'].includes(auth.user.role);

    return NextResponse.json({
      order: {
        ...order.toObject(),
        marketerDuesVisible: canSeeDues,
        commission: commission
          ? {
              ownerAmount:
                auth.user.role === 'marketer' ? undefined : Number(commission.ownerAmount || 0),
              marketerAmount: canSeeDues ? Number(commission.marketerAmount || 0) : 0,
              merchantNet:
                auth.user.role === 'owner' || auth.user.role === 'super_admin' || auth.user.role === 'merchant'
                  ? Number(commission.merchantNet || 0)
                  : undefined,
              status: commission.status,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('[v0] Order API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (auth.user.role === 'merchant' && order.merchantId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Only the assigned merchant can update this order' }, { status: 403 });
    }

    const nextStatus = String(body?.status || '').trim();
    if (!STATUS_FLOW.includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    if (!canTransition(order.status, nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${order.status} to ${nextStatus}` },
        { status: 400 }
      );
    }

    order.status = nextStatus;
    if (nextStatus === 'confirmed' && !order.confirmedAt) {
      order.confirmedAt = new Date();
    }
    if (nextStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    order.statusHistory.push({ status: nextStatus, changedBy: auth.user._id });
    await order.save();

    let commission = null;
    if (nextStatus === 'confirmed' || nextStatus === 'delivered') {
      commission = await ensureCommissionForOrder(order);
    }

    return NextResponse.json({ order, commission });
  } catch (error: any) {
    console.error('[v0] Order update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
