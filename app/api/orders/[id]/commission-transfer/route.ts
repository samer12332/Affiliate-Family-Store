import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, Order, User } from '@/lib/models';
import { createNotificationsForUsers, getAdminUserIds } from '@/lib/notifications';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

type TransferChannel = 'owner' | 'main_merchant' | 'marketer';
type TransferAction = 'mark_paid' | 'mark_received';

function getSettlementField(channel: TransferChannel) {
  if (channel === 'owner') return 'ownerSettlement';
  if (channel === 'main_merchant') return 'mainMerchantSettlement';
  return 'marketerSettlement';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const channel = String(body?.channel || '') as TransferChannel;
    const action = String(body?.action || '') as TransferAction;

    if (!['owner', 'main_merchant', 'marketer'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid transfer channel' }, { status: 400 });
    }
    if (!['mark_paid', 'mark_received'].includes(action)) {
      return NextResponse.json({ error: 'Invalid transfer action' }, { status: 400 });
    }

    const order = await Order.findById(id).select('merchantId marketerId');
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const commission = await Commission.findOne({ orderId: order._id });
    if (!commission) {
      return NextResponse.json({ error: 'Commission record is not available for this order yet' }, { status: 400 });
    }

    const merchant = await User.findById(order.merchantId).select('mainMerchantId');
    const mainMerchantId = merchant?.mainMerchantId?.toString?.() || '';
    const actorRole = normalizeRole(auth.user.role);
    const actorId = auth.user._id.toString();
    const isActorSubmerchant = isSubmerchantRole(actorRole) && order.merchantId.toString() === actorId;
    const isActorMainMerchant = isMainMerchantRole(actorRole) && mainMerchantId && mainMerchantId === actorId;
    const isActorMarketer = isMarketerRole(actorRole) && order.marketerId.toString() === actorId;
    const isActorOwner = isAdminRole(actorRole);

    const amount =
      channel === 'owner'
        ? Number(commission.ownerAmount || 0)
        : channel === 'main_merchant'
          ? Number(commission.mainMerchantAmount || 0)
          : Number(commission.marketerAmount || 0);
    if (amount <= 0) {
      return NextResponse.json({ error: 'No commission amount exists for this channel' }, { status: 400 });
    }

    let canMarkPaid = false;
    let canMarkReceived = false;
    if (channel === 'owner') {
      canMarkPaid = isActorSubmerchant || isActorMainMerchant;
      canMarkReceived = isActorOwner;
    } else if (channel === 'main_merchant') {
      if (!mainMerchantId) {
        return NextResponse.json({ error: 'This order has no main merchant commission channel' }, { status: 400 });
      }
      canMarkPaid = isActorSubmerchant;
      canMarkReceived = isActorMainMerchant;
    } else {
      canMarkPaid = isActorSubmerchant || isActorMainMerchant || isActorOwner;
      canMarkReceived = isActorMarketer;
    }

    const settlementField = getSettlementField(channel);
    const settlement = { ...(commission.get(settlementField) || {}) };

    if (action === 'mark_paid') {
      if (!canMarkPaid) {
        return NextResponse.json({ error: 'You are not allowed to mark this transfer as paid' }, { status: 403 });
      }
      if (settlement.senderMarkedPaidAt) {
        return NextResponse.json({ error: 'This transfer is already marked as paid' }, { status: 400 });
      }
      settlement.senderRole = isActorOwner ? 'owner' : actorRole;
      settlement.senderMarkedPaidBy = auth.user._id;
      settlement.senderMarkedPaidAt = new Date();
    }

    if (action === 'mark_received') {
      if (!canMarkReceived) {
        return NextResponse.json({ error: 'You are not allowed to mark this transfer as received' }, { status: 403 });
      }
      if (!settlement.senderMarkedPaidAt) {
        return NextResponse.json({ error: 'Receive cannot be marked before sender marks payment' }, { status: 400 });
      }
      if (settlement.receiverMarkedReceivedAt) {
        return NextResponse.json({ error: 'This transfer is already marked as received' }, { status: 400 });
      }
      settlement.receiverMarkedReceivedBy = auth.user._id;
      settlement.receiverMarkedReceivedAt = new Date();
    }

    commission.set(settlementField, settlement);
    await commission.save();

    const adminIds = await getAdminUserIds();
    await createNotificationsForUsers({
      userIds: [
        ...adminIds,
        order.marketerId?.toString?.(),
        order.merchantId?.toString?.(),
        mainMerchantId || null,
      ].filter((id) => String(id || '') !== auth.user._id.toString()),
      type: 'commission_transfer',
      title: `Commission ${action === 'mark_paid' ? 'payment' : 'receipt'} updated`,
      body: `${channel.replace('_', ' ')} channel was marked ${action === 'mark_paid' ? 'paid' : 'received'}.`,
      href: `/admin/orders/${order._id}`,
      metadata: { orderId: order._id?.toString?.(), channel, action },
    });

    return NextResponse.json({
      success: true,
      channel,
      settlement: {
        senderRole: settlement.senderRole || '',
        senderMarkedPaidAt: settlement.senderMarkedPaidAt || null,
        receiverMarkedReceivedAt: settlement.receiverMarkedReceivedAt || null,
      },
    });
  } catch (error: any) {
    console.error('[v0] Commission transfer update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update commission transfer status' },
      { status: 500 }
    );
  }
}
