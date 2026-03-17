import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, CommissionComplaint, Order, User } from '@/lib/models';
import { createNotificationsForUsers, getAdminUserIds } from '@/lib/notifications';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

function getSettlementField(channel: 'owner' | 'main_merchant' | 'marketer') {
  if (channel === 'owner') return 'ownerSettlement';
  if (channel === 'main_merchant') return 'mainMerchantSettlement';
  return 'marketerSettlement';
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const status = String(searchParams.get('status') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;

    const [complaints, total] = await Promise.all([
      CommissionComplaint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CommissionComplaint.countDocuments(query),
    ]);

    const orderIds = [...new Set(complaints.map((entry: any) => entry.orderId?.toString?.()).filter(Boolean))];
    const userIds = [
      ...new Set(
        complaints
          .flatMap((entry: any) => [entry.complainantUserId?.toString?.(), entry.reviewedByUserId?.toString?.()])
          .filter(Boolean)
      ),
    ];

    const orders = await Order.find({ _id: { $in: orderIds } }).select('_id orderNumber merchantId marketerId');
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email');
    const orderMap = new Map(orders.map((entry: any) => [entry._id.toString(), entry]));
    const userMap = new Map(users.map((entry: any) => [entry._id.toString(), entry]));

    return NextResponse.json({
      complaints: complaints.map((entry: any) => {
        const order = orderMap.get(entry.orderId?.toString?.() || '');
        const complainant = userMap.get(entry.complainantUserId?.toString?.() || '');
        const reviewer = userMap.get(entry.reviewedByUserId?.toString?.() || '');
        return {
          ...entry.toObject(),
          orderNumber: order?.orderNumber || 'N/A',
          complainant: complainant ? { name: complainant.name, email: complainant.email } : null,
          reviewer: reviewer ? { name: reviewer.name, email: reviewer.email } : null,
        };
      }),
      total,
      pagination: { page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: any) {
    console.error('[v0] Commission complaints API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const orderId = String(body?.orderId || '').trim();
    const channel = String(body?.channel || '') as 'owner' | 'main_merchant' | 'marketer';
    const message = String(body?.message || '').trim();
    if (!orderId || !['owner', 'main_merchant', 'marketer'].includes(channel) || !message) {
      return NextResponse.json({ error: 'orderId, channel and message are required' }, { status: 400 });
    }

    const order = await Order.findById(orderId).select('orderNumber merchantId marketerId');
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

    let canMarkReceived = false;
    if (channel === 'owner') {
      canMarkReceived = isActorOwner;
    } else if (channel === 'main_merchant') {
      canMarkReceived = isActorMainMerchant;
    } else {
      canMarkReceived = isActorMarketer;
    }
    if (!canMarkReceived) {
      return NextResponse.json({ error: 'You are not allowed to complain on this channel' }, { status: 403 });
    }

    const settlementField = getSettlementField(channel);
    const settlement = commission.get(settlementField) || {};
    if (!settlement?.senderMarkedPaidAt) {
      return NextResponse.json({ error: 'Cannot complain before sender marks payment' }, { status: 400 });
    }
    if (settlement?.receiverMarkedReceivedAt) {
      return NextResponse.json({ error: 'Payment already marked as received for this channel' }, { status: 400 });
    }

    const reportedAgainstRole = String(settlement?.senderRole || '');
    const complaint = await CommissionComplaint.create({
      orderId: order._id,
      channel,
      complainantUserId: auth.user._id,
      complainantRole: actorRole,
      reportedAgainstRole,
      message,
      status: 'open',
    });

    const adminIds = await getAdminUserIds();
    await createNotificationsForUsers({
      userIds: adminIds,
      type: 'commission_complaint',
      title: `New commission complaint on ${order.orderNumber}`,
      body: `Channel: ${channel.replace('_', ' ')}. Complainant role: ${actorRole}.`,
      href: `/admin/commission-complaints`,
      metadata: {
        complaintId: complaint._id?.toString?.(),
        orderId: order._id?.toString?.(),
        channel,
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Commission complaint creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create complaint' },
      { status: 500 }
    );
  }
}
