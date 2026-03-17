import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { OWNER_COMMISSION_RATE } from '@/lib/constants';
import { Commission, Order, Product, ShippingSystem } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ordersToday = await Order.countDocuments({ createdAt: { $gte: startOfDay, $lt: endOfDay } });
  return `FAM-${dateString}-${String(ordersToday + 1).padStart(3, '0')}`;
}

function normalizeGovernorate(value: string) {
  return String(value || '').trim().toLowerCase();
}

async function buildOrderDetails(orderProducts: any[], governorate: string, merchantId: string) {
  const items = [];
  let subtotal = 0;
  let shippingFee = 0;

  for (const entry of orderProducts) {
    const product = await Product.findById(entry.productId);
    if (!product) {
      throw new Error('One or more selected products no longer exist');
    }

    if (product.merchantId.toString() !== merchantId) {
      throw new Error('Orders can only contain products from the same merchant');
    }

    const shippingSystem = await ShippingSystem.findById(product.shippingSystemId);
    if (!shippingSystem || shippingSystem.merchantId.toString() !== merchantId) {
      throw new Error(`Product "${product.name}" does not have a valid merchant shipping system`);
    }

    const matchedFee = shippingSystem.governorateFees.find(
      (rate: any) => normalizeGovernorate(rate.governorate) === normalizeGovernorate(governorate)
    );

    if (!matchedFee) {
      throw new Error(`No shipping fee configured for governorate "${governorate}"`);
    }

    const quantity = Math.max(1, Number(entry.quantity || 1));
    const salePriceByMarketer = Number(entry.salePriceByMarketer);
    if (!Number.isFinite(salePriceByMarketer) || salePriceByMarketer < 0) {
      throw new Error(`Invalid selling price for "${product.name}"`);
    }

    const merchantPrice = Number(product.merchantPrice ?? product.price ?? 0);
    const lineSubtotal = salePriceByMarketer * quantity;
    const marketerProfit = Math.max(salePriceByMarketer - merchantPrice, 0) * quantity;

    subtotal += lineSubtotal;
    shippingFee += Number(matchedFee.fee) * quantity;

    items.push({
      productId: product._id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.images?.[0] || '',
      selectedColor: String(entry.selectedColor || ''),
      selectedSize: String(entry.selectedSize || ''),
      quantity,
      salePriceByMarketer,
      merchantPrice,
      lineSubtotal,
      marketerProfit,
    });
  }

  return {
    items,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    marketerAmount: items.reduce((sum, item) => sum + item.marketerProfit, 0),
    ownerAmount: subtotal * OWNER_COMMISSION_RATE,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    if (auth.user.role === 'merchant') {
      query.merchantId = auth.user._id;
    }

    if (auth.user.role === 'marketer') {
      query.marketerId = auth.user._id;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
    const total = await Order.countDocuments(query);
    const commissionMap = new Map(
      (
        await Commission.find({
          orderId: { $in: orders.map((order) => order._id) },
        })
      ).map((entry: any) => [entry.orderId.toString(), entry])
    );

    return NextResponse.json({
      orders: orders.map((order: any) => {
        const commission = commissionMap.get(order._id.toString());
        const canSeeDues =
          order.status === 'delivered' || auth.user.role === 'merchant' || auth.user.role === 'owner' || auth.user.role === 'super_admin';

        return {
          ...order.toObject(),
          marketerDuesVisible: canSeeDues,
          marketerAmount: canSeeDues ? Number(commission?.marketerAmount || 0) : 0,
          ownerAmount: auth.user.role === 'owner' || auth.user.role === 'super_admin' || auth.user.role === 'merchant'
            ? Number(commission?.ownerAmount || 0)
            : undefined,
        };
      }),
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Orders API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const merchantId = String(body?.merchantId || '');
    const itemsPayload = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer || {};
    const governorate = String(body?.governorate || '').trim();

    if (!merchantId || itemsPayload.length === 0 || !customer?.name || !customer?.phone || !customer?.addressLine || !governorate) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const calculated = await buildOrderDetails(itemsPayload, governorate, merchantId);
    const order = await Order.create({
      orderNumber: await generateOrderNumber(),
      merchantId,
      marketerId: auth.user._id,
      customer: {
        name: String(customer.name).trim(),
        phone: String(customer.phone).trim(),
        email: String(customer.email || '').trim(),
        addressLine: String(customer.addressLine).trim(),
        notes: String(customer.notes || '').trim(),
      },
      governorate,
      shippingFee: calculated.shippingFee,
      subtotal: calculated.subtotal,
      total: calculated.total,
      status: 'pending',
      items: calculated.items,
      statusHistory: [{ status: 'pending', changedBy: auth.user._id }],
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[v0] Order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
