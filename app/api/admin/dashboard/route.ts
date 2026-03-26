import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Order, Product, ShippingSystem, User } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

const SUBMERCHANT_ROLE_FILTER = { $in: ['submerchant', 'merchant'] };
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

async function getCommissionSettlementSummary(orderQuery: Record<string, any>) {
  const rows = await Order.aggregate([
    { $match: { ...orderQuery, status: 'delivered' } },
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
        ownerPending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.ownerAmount', 0] },
                  { $eq: [{ $ifNull: ['$commission.ownerSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.ownerAmount',
              0,
            ],
          },
        },
        ownerReceived: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.ownerAmount', 0] },
                  { $ne: [{ $ifNull: ['$commission.ownerSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.ownerAmount',
              0,
            ],
          },
        },
        mainMerchantPending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.mainMerchantAmount', 0] },
                  { $eq: [{ $ifNull: ['$commission.mainMerchantSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.mainMerchantAmount',
              0,
            ],
          },
        },
        mainMerchantReceived: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$commission.mainMerchantAmount', 0] },
                  { $ne: [{ $ifNull: ['$commission.mainMerchantSettlement.receiverMarkedReceivedAt', null] }, null] },
                ],
              },
              '$commission.mainMerchantAmount',
              0,
            ],
          },
        },
        marketerPending: {
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
        marketerReceived: {
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
    ownerPending: Number(totals.ownerPending || 0),
    ownerReceived: Number(totals.ownerReceived || 0),
    mainMerchantPending: Number(totals.mainMerchantPending || 0),
    mainMerchantReceived: Number(totals.mainMerchantReceived || 0),
    marketerPending: Number(totals.marketerPending || 0),
    marketerReceived: Number(totals.marketerReceived || 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const actorRole = normalizeRole(auth.user.role);
    let managedSubmerchantIds: string[] = [];
    if (isMainMerchantRole(actorRole)) {
      managedSubmerchantIds = await User.find({
        role: SUBMERCHANT_ROLE_FILTER,
        mainMerchantId: auth.user._id,
        active: true,
      }).distinct('_id');
    }

    const queryForRole =
      isSubmerchantRole(actorRole)
        ? { merchantId: auth.user._id }
        : isMainMerchantRole(actorRole)
          ? { merchantId: { $in: managedSubmerchantIds } }
          : isMarketerRole(actorRole)
            ? { marketerId: auth.user._id }
            : {};

    const productQuery =
      isSubmerchantRole(actorRole)
        ? { merchantId: auth.user._id }
        : isMainMerchantRole(actorRole)
          ? { merchantId: { $in: managedSubmerchantIds } }
          : {};

    const shippingQuery =
      isSubmerchantRole(actorRole)
        ? { merchantId: auth.user._id }
        : isMainMerchantRole(actorRole)
          ? { merchantId: { $in: managedSubmerchantIds } }
          : {};

    const shouldLoadProductStats = !isMarketerRole(actorRole);

    const [orders, totalOrders, totalProducts, totalShippingSystems, statusCounts] = await Promise.all([
      Order.find(queryForRole).sort({ createdAt: -1 }).limit(DASHBOARD_RECENT_ORDERS_LIMIT).select('_id orderNumber status customer.name merchantId marketerId createdAt').lean(),
      Order.countDocuments(queryForRole),
      shouldLoadProductStats ? Product.countDocuments(productQuery) : Promise.resolve(0),
      shouldLoadProductStats ? ShippingSystem.countDocuments(shippingQuery) : Promise.resolve(0),
      getOrderStatusCounts(queryForRole),
    ]);

    const [totalMerchants, totalMainMerchants, totalMarketers] = isAdminRole(actorRole)
      ? await Promise.all([
          User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER }),
          User.countDocuments({ role: 'main_merchant' }),
          User.countDocuments({ role: 'marketer' }),
        ])
      : [0, 0, 0];

    const baseStats = {
      totalOrders,
      totalProducts,
      totalMerchants,
      totalMainMerchants,
      totalMarketers,
      totalShippingSystems,
      recentOrders: orders,
      statusCounts,
    };

    if (isMarketerRole(actorRole)) {
      const [settlementTotals, visibleSubmerchants] = await Promise.all([
        getCommissionSettlementSummary(queryForRole),
        auth.user.mainMerchantId
          ? User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER, mainMerchantId: auth.user.mainMerchantId, active: true })
          : User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER, active: true }),
      ]);

      return NextResponse.json({
        ...baseStats,
        visibleSubmerchants,
        visibleDues: settlementTotals.marketerPending,
        visibleDuesPending: settlementTotals.marketerPending,
        visibleDuesReceived: settlementTotals.marketerReceived,
      });
    }

    if (isSubmerchantRole(actorRole)) {
      const totals = await getCommissionSettlementSummary(queryForRole);
      return NextResponse.json({
        ...baseStats,
        payableToMarketers: totals.marketerPending,
        payableToMarketersPending: totals.marketerPending,
        payableToMarketersReceived: totals.marketerReceived,
        ownerCommissionDue: totals.ownerPending,
        ownerCommissionDuePending: totals.ownerPending,
        ownerCommissionDueReceived: totals.ownerReceived,
        mainMerchantCommissionDue: totals.mainMerchantPending,
        mainMerchantCommissionDuePending: totals.mainMerchantPending,
        mainMerchantCommissionDueReceived: totals.mainMerchantReceived,
      });
    }

    if (isMainMerchantRole(actorRole)) {
      const submerchants = await User.find({
        role: SUBMERCHANT_ROLE_FILTER,
        mainMerchantId: auth.user._id,
      })
        .select('_id name merchantProfile active')
        .lean();

      const [orderCountsAgg, productCountsAgg] = await Promise.all([
        Order.aggregate([
          { $match: { merchantId: { $in: managedSubmerchantIds } } },
          {
            $group: {
              _id: '$merchantId',
              totalOrders: { $sum: 1 },
              deliveredOrders: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
                },
              },
            },
          },
        ]),
        Product.aggregate([
          { $match: { merchantId: { $in: managedSubmerchantIds } } },
          { $group: { _id: '$merchantId', products: { $sum: 1 } } },
        ]),
      ]);

      const orderCountMap = new Map(
        orderCountsAgg.map((entry: any) => [
          entry._id?.toString?.() || String(entry._id),
          { totalOrders: Number(entry.totalOrders || 0), deliveredOrders: Number(entry.deliveredOrders || 0) },
        ])
      );
      const productCountMap = new Map(
        productCountsAgg.map((entry: any) => [
          entry._id?.toString?.() || String(entry._id),
          Number(entry.products || 0),
        ])
      );

      const details = submerchants.map((entry: any) => {
        const merchantId = entry._id?.toString?.() || String(entry._id);
        const orderCounts = orderCountMap.get(merchantId) || { totalOrders: 0, deliveredOrders: 0 };
        return {
          id: merchantId,
          name: entry.name,
          storeName: entry.merchantProfile?.storeName || entry.name,
          active: Boolean(entry.active),
          orders: orderCounts.totalOrders,
          deliveredOrders: orderCounts.deliveredOrders,
          products: productCountMap.get(merchantId) || 0,
        };
      });

      const settlementTotals = await getCommissionSettlementSummary(queryForRole);
      return NextResponse.json({
        ...baseStats,
        submerchantDetails: details,
        managedSubmerchants: details.length,
        managedMarketers: await User.countDocuments({ role: 'marketer', mainMerchantId: auth.user._id }),
        totalMainMerchantCommissions: settlementTotals.mainMerchantPending,
        totalMainMerchantCommissionsPending: settlementTotals.mainMerchantPending,
        totalMainMerchantCommissionsReceived: settlementTotals.mainMerchantReceived,
      });
    }

    const settlementTotals = await getCommissionSettlementSummary(queryForRole);
    return NextResponse.json({
      ...baseStats,
      totalCommissions: settlementTotals.ownerPending,
      totalCommissionsPending: settlementTotals.ownerPending,
      totalCommissionsReceived: settlementTotals.ownerReceived,
    });
  } catch (error: any) {
    console.error('[v0] Admin dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

