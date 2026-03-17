import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, Order, Product, ShippingSystem, User } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

const SUBMERCHANT_ROLE_FILTER = { $in: ['submerchant', 'merchant'] };

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
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

    const [orders, products, commissions] = await Promise.all([
      Order.find(queryForRole).sort({ createdAt: -1 }).limit(10).lean(),
      Product.find(productQuery).sort({ createdAt: -1 }).limit(10).lean(),
      Commission.find({}).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const [
      totalOrders,
      totalProducts,
      totalMerchants,
      totalMainMerchants,
      totalMarketers,
      totalShippingSystems,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      Order.countDocuments(queryForRole),
      Product.countDocuments(productQuery),
      User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER }),
      User.countDocuments({ role: 'main_merchant' }),
      User.countDocuments({ role: 'marketer' }),
      ShippingSystem.countDocuments(shippingQuery),
      Order.countDocuments({ ...queryForRole, status: 'pending' }),
      Order.countDocuments({ ...queryForRole, status: 'confirmed' }),
      Order.countDocuments({ ...queryForRole, status: 'shipped' }),
      Order.countDocuments({ ...queryForRole, status: 'delivered' }),
      Order.countDocuments({ ...queryForRole, status: 'cancelled' }),
    ]);

    const baseStats = {
      totalOrders,
      totalProducts,
      totalMerchants,
      totalMainMerchants,
      totalMarketers,
      totalShippingSystems,
      recentOrders: orders,
      recentProducts: products,
      statusCounts: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
    };

    if (isMarketerRole(actorRole)) {
      const [marketerCommissions, visibleSubmerchants] = await Promise.all([
        Commission.find()
          .where('orderId')
          .in(orders.filter((order: any) => order.status === 'delivered').map((order: any) => order._id))
          .select('marketerAmount')
          .lean(),
        auth.user.mainMerchantId
          ? User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER, mainMerchantId: auth.user.mainMerchantId, active: true })
          : User.countDocuments({ role: SUBMERCHANT_ROLE_FILTER, active: true }),
      ]);

      return NextResponse.json({
        ...baseStats,
        visibleSubmerchants,
        visibleDues: marketerCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
      });
    }

    if (isSubmerchantRole(actorRole)) {
      const merchantOrderIds = orders.map((order: any) => order._id);
      const merchantCommissions = await Commission.find()
        .where('orderId')
        .in(merchantOrderIds)
        .select('marketerAmount ownerAmount mainMerchantAmount')
        .lean();
      return NextResponse.json({
        ...baseStats,
        payableToMarketers: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
        ownerCommissionDue: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.ownerAmount || 0), 0),
        mainMerchantCommissionDue: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.mainMerchantAmount || 0), 0),
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

      return NextResponse.json({
        ...baseStats,
        submerchantDetails: details,
        managedSubmerchants: details.length,
        managedMarketers: await User.countDocuments({ role: 'marketer', mainMerchantId: auth.user._id }),
        totalMainMerchantCommissions: await (async () => {
          const managedOrderIds = await Order.find({ merchantId: { $in: managedSubmerchantIds } }).distinct('_id');
          const totals = await Commission.aggregate([
            { $match: { orderId: { $in: managedOrderIds } } },
            { $group: { _id: null, total: { $sum: '$mainMerchantAmount' } } },
          ]);
          return Number(totals?.[0]?.total || 0);
        })(),
        mainMerchantCommissions: await (async () => {
          const managedOrders = await Order.find({ merchantId: { $in: managedSubmerchantIds } })
            .sort({ createdAt: -1 })
            .limit(40)
            .select('_id orderNumber merchantId marketerId')
            .lean();
          const managedOrderIds = managedOrders.map((entry: any) => entry._id);
          const managedCommissions = await Commission.find()
            .where('orderId')
            .in(managedOrderIds)
            .sort({ createdAt: -1 })
            .lean();
          const submerchantIds = [
            ...new Set(managedOrders.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean)),
          ];
          const marketerIds = [
            ...new Set(managedOrders.map((entry: any) => entry.marketerId?.toString?.()).filter(Boolean)),
          ];
          const users = await User.find({ _id: { $in: [...submerchantIds, ...marketerIds] } })
            .select('_id name email merchantProfile')
            .lean();
          const userMap = new Map(users.map((entry: any) => [entry._id.toString(), entry]));
          const orderMap = new Map(managedOrders.map((entry: any) => [entry._id.toString(), entry]));

          return managedCommissions.map((item: any) => {
            const order = orderMap.get(item.orderId?.toString?.() || '');
            const submerchant = order?.merchantId ? userMap.get(order.merchantId.toString()) : null;
            const marketer = order?.marketerId ? userMap.get(order.marketerId.toString()) : null;
            return {
              orderId: item.orderId?.toString?.() || null,
              orderNumber: order?.orderNumber || 'N/A',
              mainMerchantAmount: Number(item.mainMerchantAmount || 0),
              status: item.status,
              collectFrom: submerchant?.merchantProfile?.storeName || submerchant?.name || 'Unknown submerchant',
              marketer: marketer?.name || 'Unknown marketer',
            };
          });
        })(),
      });
    }

    const commissionOrderIds = commissions.map((item: any) => item.orderId).filter(Boolean);
    const commissionOrders = await Order.find({ _id: { $in: commissionOrderIds } })
      .select('_id orderNumber merchantId marketerId')
      .lean();
    const merchantIds = [...new Set(commissionOrders.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean))];
    const marketerIds = [...new Set(commissionOrders.map((entry: any) => entry.marketerId?.toString?.()).filter(Boolean))];
    const users = await User.find({ _id: { $in: [...merchantIds, ...marketerIds] } })
      .select('_id name merchantProfile')
      .lean();
    const userMap = new Map(users.map((entry: any) => [entry._id.toString(), entry]));
    const orderMap = new Map(commissionOrders.map((entry: any) => [entry._id.toString(), entry]));

    const commissionBreakdown = commissions.map((item: any) => {
      const order = orderMap.get(item.orderId?.toString?.() || '');
      const merchant = order?.merchantId ? userMap.get(order.merchantId.toString()) : null;
      const marketer = order?.marketerId ? userMap.get(order.marketerId.toString()) : null;
      return {
        orderId: item.orderId?.toString?.() || null,
        orderNumber: order?.orderNumber || 'N/A',
        ownerAmount: Number(item.ownerAmount || 0),
        status: item.status,
        collectFrom: merchant?.merchantProfile?.storeName || merchant?.name || 'Unknown submerchant',
        marketer: marketer?.name || 'Unknown marketer',
      };
    });

    return NextResponse.json({
      ...baseStats,
      totalCommissions: commissions.reduce((sum: number, item: any) => sum + Number(item.ownerAmount || 0), 0),
      commissions: commissionBreakdown,
    });
  } catch (error: any) {
    console.error('[v0] Admin dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
