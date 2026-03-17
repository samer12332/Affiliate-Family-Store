import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MAIN_MERCHANT_COMMISSION_RATE, OWNER_COMMISSION_RATE } from '@/lib/constants';
import { Commission, Order, Product, User } from '@/lib/models';
import { createNotificationsForUsers, getAdminUserIds } from '@/lib/notifications';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId } from '@/lib/validation';
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
  const merchantSubtotal = order.items.reduce(
    (sum: number, item: any) => sum + Number(item.merchantPrice || 0) * Number(item.quantity || 0),
    0
  );
  const marketerAmount = order.items.reduce(
    (sum: number, item: any) => sum + Number(item.marketerProfit || 0),
    0
  );
  const merchant = await User.findById(order.merchantId).select('mainMerchantId');
  const hasMainMerchant = Boolean(merchant?.mainMerchantId);
  const ownerAmount = merchantSubtotal * OWNER_COMMISSION_RATE;
  const mainMerchantAmount = hasMainMerchant ? merchantSubtotal * MAIN_MERCHANT_COMMISSION_RATE : 0;
  const merchantNet = Math.max(merchantSubtotal - ownerAmount - mainMerchantAmount, 0);

  const commission = await Commission.findOneAndUpdate(
    { orderId: order._id },
    {
      ownerAmount,
      mainMerchantAmount,
      marketerAmount,
      merchantNet,
      status: order.status === 'delivered' ? 'delivered' : 'confirmed',
    },
    { new: true, upsert: true }
  );

  return commission;
}

async function restoreOrderStock(order: any) {
  const stockByProduct = new Map<string, number>();

  for (const item of order.items || []) {
    const productId = item?.productId?.toString?.() || String(item?.productId || '');
    if (!productId) continue;
    const quantity = Math.max(1, Number(item?.quantity || 1));
    stockByProduct.set(productId, (stockByProduct.get(productId) || 0) + quantity);
  }

  await Promise.all(
    Array.from(stockByProduct.entries()).map(([productId, quantity]) =>
      Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } })
    )
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const actorRole = normalizeRole(auth.user.role);

    if (isSubmerchantRole(actorRole) && order.merchantId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isMarketerRole(actorRole) && order.marketerId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isMainMerchantRole(actorRole)) {
      const merchant = await User.findById(order.merchantId).select('mainMerchantId');
      if (!merchant || merchant.mainMerchantId?.toString?.() !== auth.user._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const commission = await Commission.findOne({ orderId: order._id });
    const [marketerUser, submerchantUser] = await Promise.all([
      User.findById(order.marketerId).select('name email'),
      User.findById(order.merchantId).select('name email mainMerchantId merchantProfile'),
    ]);
    const mainMerchantUser =
      submerchantUser?.mainMerchantId
        ? await User.findById(submerchantUser.mainMerchantId).select('name email')
        : null;

    const canSeeDues =
      order.status === 'delivered' ||
      isSubmerchantRole(actorRole) ||
      isMainMerchantRole(actorRole) ||
      isAdminRole(actorRole);

    return NextResponse.json({
      order: {
        ...order.toObject(),
        marketerDuesVisible: canSeeDues,
        commission: commission
          ? {
              ownerAmount:
                isMarketerRole(actorRole) ? undefined : Number(commission.ownerAmount || 0),
              mainMerchantAmount:
                isMarketerRole(actorRole) ? undefined : Number(commission.mainMerchantAmount || 0),
              marketerAmount: canSeeDues ? Number(commission.marketerAmount || 0) : 0,
              merchantNet:
                isAdminRole(actorRole) || isMainMerchantRole(actorRole) || isSubmerchantRole(actorRole)
                  ? Number(commission.merchantNet || 0)
                  : undefined,
              settlements: {
                owner: commission.ownerSettlement
                  ? {
                      senderRole: String(commission.ownerSettlement.senderRole || ''),
                      senderMarkedPaidAt: commission.ownerSettlement.senderMarkedPaidAt || null,
                      receiverMarkedReceivedAt: commission.ownerSettlement.receiverMarkedReceivedAt || null,
                    }
                  : null,
                mainMerchant: commission.mainMerchantSettlement
                  ? {
                      senderRole: String(commission.mainMerchantSettlement.senderRole || ''),
                      senderMarkedPaidAt: commission.mainMerchantSettlement.senderMarkedPaidAt || null,
                      receiverMarkedReceivedAt: commission.mainMerchantSettlement.receiverMarkedReceivedAt || null,
                    }
                  : null,
                marketer: commission.marketerSettlement
                  ? {
                      senderRole: String(commission.marketerSettlement.senderRole || ''),
                      senderMarkedPaidAt: commission.marketerSettlement.senderMarkedPaidAt || null,
                      receiverMarkedReceivedAt: commission.marketerSettlement.receiverMarkedReceivedAt || null,
                    }
                  : null,
              },
              status: commission.status,
            }
          : null,
        participants: {
          marketer: marketerUser
            ? {
                id: marketerUser._id?.toString?.() || null,
                name: marketerUser.name || '',
                email: marketerUser.email || '',
              }
            : null,
          submerchant: submerchantUser
            ? {
                id: submerchantUser._id?.toString?.() || null,
                name: submerchantUser.merchantProfile?.storeName || submerchantUser.name || '',
                email: submerchantUser.email || '',
              }
            : null,
          mainMerchant: mainMerchantUser
            ? {
                id: mainMerchantUser._id?.toString?.() || null,
                name: mainMerchantUser.name || '',
                email: mainMerchantUser.email || '',
              }
            : null,
        },
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
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    const body = await request.json();
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const actorRole = normalizeRole(auth.user.role);
    if (isSubmerchantRole(actorRole) && order.merchantId.toString() !== auth.user._id.toString()) {
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

    const previousStatus = String(order.status || '');
    order.status = nextStatus;
    if (nextStatus === 'confirmed' && !order.confirmedAt) {
      order.confirmedAt = new Date();
    }
    if (nextStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    order.statusHistory.push({ status: nextStatus, changedBy: auth.user._id });
    await order.save();

    if (nextStatus === 'cancelled' && previousStatus !== 'cancelled') {
      await restoreOrderStock(order);
    }

    let commission = null;
    if (nextStatus === 'confirmed' || nextStatus === 'delivered') {
      commission = await ensureCommissionForOrder(order);
    }

    const [merchantUser, adminIds] = await Promise.all([
      User.findById(order.merchantId).select('mainMerchantId'),
      getAdminUserIds(),
    ]);
    const generalRecipients = [
      order.marketerId?.toString?.(),
      order.merchantId?.toString?.(),
    ];
    const deliveredRecipients =
      nextStatus === 'delivered'
        ? [...adminIds, merchantUser?.mainMerchantId?.toString?.()]
        : [];

    await createNotificationsForUsers({
      userIds: [...generalRecipients, ...deliveredRecipients].filter(
        (id) => String(id || '') !== auth.user._id.toString()
      ),
      type: 'order_status',
      title: `Order ${order.orderNumber} updated`,
      body:
        nextStatus === 'delivered'
          ? 'Order is delivered. Commission settlement can now proceed.'
          : `Status changed to ${nextStatus}.`,
      href: `/admin/orders/${order._id}`,
      metadata: { orderId: order._id?.toString?.(), status: nextStatus },
    });

    return NextResponse.json({ order, commission });
  } catch (error: any) {
    console.error('[v0] Order update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
