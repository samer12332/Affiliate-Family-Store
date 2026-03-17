import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, Order, Product, ShippingSystem, User } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

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
        role: { $in: ['submerchant', 'merchant'] },
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
      Order.find(queryForRole).sort({ createdAt: -1 }).limit(10),
      Product.find(productQuery).sort({ createdAt: -1 }).limit(10),
      Commission.find({}).sort({ createdAt: -1 }).limit(20),
    ]);

    const baseStats = {
      totalOrders: await Order.countDocuments(queryForRole),
      totalProducts: await Product.countDocuments(productQuery),
      totalMerchants: await User.countDocuments({ role: { $in: ['submerchant', 'merchant'] } }),
      totalMainMerchants: await User.countDocuments({ role: 'main_merchant' }),
      totalMarketers: await User.countDocuments({ role: 'marketer' }),
      totalShippingSystems: await ShippingSystem.countDocuments(shippingQuery),
      recentOrders: orders,
      recentProducts: products,
      statusCounts: {
        pending: await Order.countDocuments({ ...queryForRole, status: 'pending' }),
        confirmed: await Order.countDocuments({ ...queryForRole, status: 'confirmed' }),
        shipped: await Order.countDocuments({ ...queryForRole, status: 'shipped' }),
        delivered: await Order.countDocuments({ ...queryForRole, status: 'delivered' }),
        cancelled: await Order.countDocuments({ ...queryForRole, status: 'cancelled' }),
      },
    };

    if (isMarketerRole(actorRole)) {
      const marketerCommissions = await Commission.find({
        orderId: { $in: orders.filter((order: any) => order.status === 'delivered').map((order: any) => order._id) },
      });

      return NextResponse.json({
        ...baseStats,
        visibleSubmerchants: auth.user.mainMerchantId
          ? await User.countDocuments({ role: { $in: ['submerchant', 'merchant'] }, mainMerchantId: auth.user.mainMerchantId, active: true })
          : await User.countDocuments({ role: { $in: ['submerchant', 'merchant'] }, active: true }),
        visibleDues: marketerCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
      });
    }

    if (isSubmerchantRole(actorRole)) {
      const merchantOrderIds = orders.map((order: any) => order._id);
      const merchantCommissions = await Commission.find({ orderId: { $in: merchantOrderIds } });
      return NextResponse.json({
        ...baseStats,
        payableToMarketers: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
        ownerCommissionDue: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.ownerAmount || 0), 0),
        mainMerchantCommissionDue: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.mainMerchantAmount || 0), 0),
      });
    }

    if (isMainMerchantRole(actorRole)) {
      const submerchants = await User.find({
        role: { $in: ['submerchant', 'merchant'] },
        mainMerchantId: auth.user._id,
      }).select('_id name merchantProfile active');

      const details = await Promise.all(
        submerchants.map(async (entry: any) => {
          const merchantId = entry._id;
          const [orderCount, deliveredCount, productCount] = await Promise.all([
            Order.countDocuments({ merchantId }),
            Order.countDocuments({ merchantId, status: 'delivered' }),
            Product.countDocuments({ merchantId }),
          ]);
          return {
            id: merchantId.toString(),
            name: entry.name,
            storeName: entry.merchantProfile?.storeName || entry.name,
            active: Boolean(entry.active),
            orders: orderCount,
            deliveredOrders: deliveredCount,
            products: productCount,
          };
        })
      );

      return NextResponse.json({
        ...baseStats,
        submerchantDetails: details,
        managedSubmerchants: details.length,
        managedMarketers: await User.countDocuments({ role: 'marketer', mainMerchantId: auth.user._id }),
        totalMainMerchantCommissions: (
          await Commission.find({
            orderId: {
              $in: await Order.find({ merchantId: { $in: managedSubmerchantIds } }).distinct('_id'),
            },
          })
        ).reduce((sum: number, item: any) => sum + Number(item.mainMerchantAmount || 0), 0),
        mainMerchantCommissions: await (async () => {
          const managedOrders = await Order.find({ merchantId: { $in: managedSubmerchantIds } })
            .sort({ createdAt: -1 })
            .limit(40)
            .select('_id orderNumber merchantId marketerId');
          const managedOrderIds = managedOrders.map((entry: any) => entry._id);
          const managedCommissions = await Commission.find({ orderId: { $in: managedOrderIds } }).sort({ createdAt: -1 });
          const submerchantIds = [
            ...new Set(managedOrders.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean)),
          ];
          const marketerIds = [
            ...new Set(managedOrders.map((entry: any) => entry.marketerId?.toString?.()).filter(Boolean)),
          ];
          const users = await User.find({ _id: { $in: [...submerchantIds, ...marketerIds] } }).select('_id name email merchantProfile');
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
    const commissionOrders = await Order.find({ _id: { $in: commissionOrderIds } }).select('_id orderNumber merchantId marketerId');
    const merchantIds = [...new Set(commissionOrders.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean))];
    const marketerIds = [...new Set(commissionOrders.map((entry: any) => entry.marketerId?.toString?.()).filter(Boolean))];
    const users = await User.find({ _id: { $in: [...merchantIds, ...marketerIds] } }).select('_id name merchantProfile');
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
