import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, CommissionComplaint, Order, User } from '@/lib/models';
import { createNotificationsForUsers, getAdminUserIds } from '@/lib/notifications';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId, parsePositiveInt, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

const COMPLAINT_COOLDOWN_DAYS = 5;
const COMPLAINT_COOLDOWN_MS = COMPLAINT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const WHATSAPP_REGEX = /^\+?[0-9][0-9\s-]{7,19}$/;

function getSettlementField(channel: 'owner' | 'main_merchant' | 'marketer') {
  if (channel === 'owner') return 'ownerSettlement';
  if (channel === 'main_merchant') return 'mainMerchantSettlement';
  return 'marketerSettlement';
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin']);
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const status = String(searchParams.get('status') || '').trim();
    const page = parsePositiveInt(searchParams.get('page'), 1, 5000);
    const limit = parsePositiveInt(searchParams.get('limit'), 20, 100);
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
    const auth = await requireRole(request, ['owner', 'admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const orderId = String(body?.orderId || '').trim();
    const channel = String(body?.channel || '') as 'owner' | 'main_merchant' | 'marketer';
    const message = safeTrim(body?.message, 2000);
    const whatsappNumber = safeTrim(body?.whatsappNumber, 30);
    if (!orderId || !['owner', 'main_merchant', 'marketer'].includes(channel) || !message || !whatsappNumber) {
      return NextResponse.json({ error: 'orderId, channel, message and whatsappNumber are required' }, { status: 400 });
    }
    if (!WHATSAPP_REGEX.test(whatsappNumber)) {
      return NextResponse.json(
        { error: 'Please provide a valid WhatsApp number (digits with optional +, spaces, or dashes).' },
        { status: 400 }
      );
    }
    if (!isValidObjectId(orderId)) {
      return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 });
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

    const latestComplaint = await CommissionComplaint.findOne({ complainantUserId: auth.user._id })
      .sort({ createdAt: -1 })
      .select('createdAt');
    if (latestComplaint?.createdAt) {
      const nextAllowedAt = new Date(latestComplaint.createdAt).getTime() + COMPLAINT_COOLDOWN_MS;
      if (Date.now() < nextAllowedAt) {
        return NextResponse.json(
          {
            error: `You can submit a new complaint after ${new Date(nextAllowedAt).toISOString()}. Cooldown is ${COMPLAINT_COOLDOWN_DAYS} days.`,
          },
          { status: 429 }
        );
      }
    }

    const reportedAgainstRole = String(settlement?.senderRole || '');
    const complaint = await CommissionComplaint.create({
      orderId: order._id,
      channel,
      complainantUserId: auth.user._id,
      complainantRole: actorRole,
      reportedAgainstRole,
      whatsappNumber,
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
