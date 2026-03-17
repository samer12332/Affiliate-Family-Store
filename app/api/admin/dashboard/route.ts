import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Commission, Order, Product, ShippingSystem, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const queryForRole =
      auth.user.role === 'merchant'
        ? { merchantId: auth.user._id }
        : auth.user.role === 'marketer'
          ? { marketerId: auth.user._id }
          : {};

    const [orders, products, commissions] = await Promise.all([
      Order.find(queryForRole).sort({ createdAt: -1 }).limit(10),
      Product.find(auth.user.role === 'merchant' ? { merchantId: auth.user._id } : {}).sort({ createdAt: -1 }).limit(10),
      Commission.find({}).sort({ createdAt: -1 }).limit(20),
    ]);

    const baseStats = {
      totalOrders: await Order.countDocuments(queryForRole),
      totalProducts:
        auth.user.role === 'merchant'
          ? await Product.countDocuments({ merchantId: auth.user._id })
          : await Product.countDocuments({}),
      totalMerchants: await User.countDocuments({ role: 'merchant' }),
      totalMarketers: await User.countDocuments({ role: 'marketer' }),
      totalShippingSystems:
        auth.user.role === 'merchant'
          ? await ShippingSystem.countDocuments({ merchantId: auth.user._id })
          : await ShippingSystem.countDocuments({}),
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

    if (auth.user.role === 'marketer') {
      const marketerCommissions = await Commission.find({
        orderId: { $in: orders.filter((order: any) => order.status === 'delivered').map((order: any) => order._id) },
      });

      return NextResponse.json({
        ...baseStats,
        visibleDues: marketerCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
      });
    }

    if (auth.user.role === 'merchant') {
      const merchantOrderIds = orders.map((order: any) => order._id);
      const merchantCommissions = await Commission.find({ orderId: { $in: merchantOrderIds } });
      return NextResponse.json({
        ...baseStats,
        payableToMarketers: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.marketerAmount || 0), 0),
        ownerCommissionDue: merchantCommissions.reduce((sum: number, item: any) => sum + Number(item.ownerAmount || 0), 0),
      });
    }

    return NextResponse.json({
      ...baseStats,
      totalCommissions: commissions.reduce((sum: number, item: any) => sum + Number(item.ownerAmount || 0), 0),
      commissions,
    });
  } catch (error: any) {
    console.error('[v0] Admin dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
