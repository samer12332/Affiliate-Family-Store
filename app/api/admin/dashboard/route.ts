import { connectDB } from '@/lib/db';
import { AdminUser, Message, Order, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();

    const [totalOrders, totalProducts, totalMessages, totalUsers, recentOrders, topProducts] =
      await Promise.all([
        Order.countDocuments({}),
        Product.countDocuments({}),
        Message.countDocuments({}),
        AdminUser.countDocuments({}),
        Order.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Product.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    return NextResponse.json({
      totalOrders,
      totalProducts,
      totalMessages,
      totalUsers,
      recentOrders,
      topProducts,
    });
  } catch (error: any) {
    console.error('[v0] Admin dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
