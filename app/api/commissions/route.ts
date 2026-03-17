import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, Order, User } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) return auth.response;

    const actorRole = normalizeRole(auth.user.role);
    const actorId = auth.user._id.toString();

    let orderQuery: any = {};
    if (isSubmerchantRole(actorRole)) {
      orderQuery.merchantId = auth.user._id;
    } else if (isMainMerchantRole(actorRole)) {
      const managedIds = await User.find({
        role: { $in: ['submerchant', 'merchant'] },
        mainMerchantId: auth.user._id,
        active: true,
      }).distinct('_id');
      orderQuery.merchantId = { $in: managedIds };
    } else if (isMarketerRole(actorRole)) {
      orderQuery.marketerId = auth.user._id;
    }

    const orders = await Order.find(orderQuery)
      .sort({ createdAt: -1 })
      .limit(120)
      .select('_id orderNumber merchantId marketerId status createdAt');
    const orderIds = orders.map((entry: any) => entry._id);
    const commissions = await Commission.find().where('orderId').in(orderIds);
    const commissionMap = new Map(commissions.map((entry: any) => [entry.orderId.toString(), entry]));

    const merchantIds = [...new Set(orders.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean))];
    const marketerIds = [...new Set(orders.map((entry: any) => entry.marketerId?.toString?.()).filter(Boolean))];
    const users = await User.find({ _id: { $in: [...merchantIds, ...marketerIds] } }).select('_id name email mainMerchantId merchantProfile');
    const userMap = new Map(users.map((entry: any) => [entry._id.toString(), entry]));

    const rows: any[] = [];
    for (const order of orders) {
      const commission = commissionMap.get(order._id.toString());
      if (!commission) continue;

      const submerchant = userMap.get(order.merchantId?.toString?.() || '');
      const marketer = userMap.get(order.marketerId?.toString?.() || '');
      const mainMerchantId = submerchant?.mainMerchantId?.toString?.() || '';
      const isActorSubmerchant = isSubmerchantRole(actorRole) && order.merchantId.toString() === actorId;
      const isActorMainMerchant = isMainMerchantRole(actorRole) && mainMerchantId === actorId;
      const isActorMarketer = isMarketerRole(actorRole) && order.marketerId.toString() === actorId;
      const isActorOwner = isAdminRole(actorRole);

      const channels = [
        {
          channel: 'owner',
          amount: Number(commission.ownerAmount || 0),
          settlement: commission.ownerSettlement || {},
          canMarkPaid: isActorSubmerchant || isActorMainMerchant,
          canMarkReceived: isActorOwner,
        },
        {
          channel: 'main_merchant',
          amount: Number(commission.mainMerchantAmount || 0),
          settlement: commission.mainMerchantSettlement || {},
          canMarkPaid: isActorSubmerchant,
          canMarkReceived: isActorMainMerchant,
        },
        {
          channel: 'marketer',
          amount: Number(commission.marketerAmount || 0),
          settlement: commission.marketerSettlement || {},
          canMarkPaid: isActorSubmerchant || isActorMainMerchant || isActorOwner,
          canMarkReceived: isActorMarketer,
        },
      ].filter((entry) => entry.amount > 0);

      for (const channel of channels) {
        const senderPaid = Boolean(channel.settlement?.senderMarkedPaidAt);
        const receiverReceived = Boolean(channel.settlement?.receiverMarkedReceivedAt);
        rows.push({
          id: `${order._id}:${channel.channel}`,
          orderId: order._id?.toString?.() || '',
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          channel: channel.channel,
          amount: channel.amount,
          senderMarkedPaidAt: channel.settlement?.senderMarkedPaidAt || null,
          receiverMarkedReceivedAt: channel.settlement?.receiverMarkedReceivedAt || null,
          senderRole: channel.settlement?.senderRole || '',
          canMarkPaid: channel.canMarkPaid && !senderPaid,
          canMarkReceived: channel.canMarkReceived && senderPaid && !receiverReceived,
          collectFrom: submerchant?.merchantProfile?.storeName || submerchant?.name || 'Unknown submerchant',
          marketer: marketer?.name || 'Unknown marketer',
          href: `/admin/orders/${order._id}`,
        });
      }
    }

    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error('[v0] Commissions API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch commissions' },
      { status: 500 }
    );
  }
}
