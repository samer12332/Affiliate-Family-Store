import { getManagedSubmerchantIds, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { OWNER_COMMISSION_RATE } from '@/lib/constants';
import { Commission, Order, Product, ShippingSystem, User } from '@/lib/models';
import { createNotificationsForUsers } from '@/lib/notifications';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
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

type StockAdjustment = {
  productId: string;
  quantity: number;
};

async function reserveProductStock(adjustments: StockAdjustment[]) {
  const applied: StockAdjustment[] = [];

  try {
    for (const adjustment of adjustments) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: adjustment.productId,
          stock: { $gte: adjustment.quantity },
        },
        {
          $inc: { stock: -adjustment.quantity },
        },
        { new: true }
      ).select('name stock');

      if (!updated) {
        throw new Error('One or more products are out of stock for the requested quantity');
      }

      applied.push(adjustment);
    }
  } catch (error) {
    if (applied.length > 0) {
      await Promise.all(
        applied.map((adjustment) =>
          Product.findByIdAndUpdate(adjustment.productId, { $inc: { stock: adjustment.quantity } })
        )
      );
    }
    throw error;
  }
}

async function restoreProductStock(adjustments: StockAdjustment[]) {
  if (adjustments.length === 0) return;
  await Promise.all(
    adjustments.map((adjustment) =>
      Product.findByIdAndUpdate(adjustment.productId, { $inc: { stock: adjustment.quantity } })
    )
  );
}

async function buildOrderDetails(orderProducts: any[], governorate: string, merchantId: string) {
  const items = [];
  let subtotal = 0;
  let shippingFee = 0;
  let merchantSubtotal = 0;
  let sharedShippingSystemId = '';
  const stockByProduct = new Map<string, number>();

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

    const quantity = Number(entry.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for "${product.name}"`);
    }

    const currentStock = Number(product.stock ?? 0);
    if (quantity > currentStock) {
      throw new Error(`Insufficient stock for "${product.name}". Available: ${currentStock}`);
    }

    const salePriceByMarketer = Number(entry.salePriceByMarketer);
    if (!Number.isFinite(salePriceByMarketer) || salePriceByMarketer < 0) {
      throw new Error(`Invalid selling price for "${product.name}"`);
    }

    const merchantPrice = Number(product.merchantPrice ?? product.price ?? 0);
    if (salePriceByMarketer < merchantPrice) {
      throw new Error(`Selling price for "${product.name}" cannot be below merchant price`);
    }
    const lineSubtotal = salePriceByMarketer * quantity;
    const merchantLineSubtotal = merchantPrice * quantity;
    const marketerProfit = Math.max(salePriceByMarketer - merchantPrice, 0) * quantity;

    subtotal += lineSubtotal;
    merchantSubtotal += merchantLineSubtotal;

    const currentShippingSystemId = String(product.shippingSystemId || '');
    if (!sharedShippingSystemId) {
      sharedShippingSystemId = currentShippingSystemId;
      // Cart policy enforces one shipping system for the grouped order.
      shippingFee = Number(matchedFee.fee);
    } else if (sharedShippingSystemId !== currentShippingSystemId) {
      throw new Error('All items in one order must use the same shipping system');
    }

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

    const productId = product._id.toString();
    stockByProduct.set(productId, (stockByProduct.get(productId) || 0) + quantity);
  }

  return {
    items,
    subtotal,
    merchantSubtotal,
    shippingFee,
    total: subtotal + shippingFee,
    marketerAmount: items.reduce((sum, item) => sum + item.marketerProfit, 0),
    ownerAmount: merchantSubtotal * OWNER_COMMISSION_RATE,
    stockAdjustments: Array.from(stockByProduct.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    const actorRole = normalizeRole(auth.user.role);
    if (status) {
      query.status = status;
    }

    if (isSubmerchantRole(actorRole)) {
      query.merchantId = auth.user._id;
    }

    if (isMainMerchantRole(actorRole)) {
      const managedIds = await getManagedSubmerchantIds(auth.user._id.toString());
      query.merchantId = { $in: managedIds };
    }

    if (isMarketerRole(actorRole)) {
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
          order.status === 'delivered' || isSubmerchantRole(actorRole) || isMainMerchantRole(actorRole) || isAdminRole(actorRole);

        return {
          ...order.toObject(),
          marketerDuesVisible: canSeeDues,
          marketerAmount: canSeeDues ? Number(commission?.marketerAmount || 0) : 0,
          ownerAmount: isAdminRole(actorRole) || isSubmerchantRole(actorRole) || isMainMerchantRole(actorRole)
            ? Number(commission?.ownerAmount || 0)
            : undefined,
          mainMerchantAmount: isAdminRole(actorRole) || isSubmerchantRole(actorRole) || isMainMerchantRole(actorRole)
            ? Number(commission?.mainMerchantAmount || 0)
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
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'marketer']);
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

    const merchant = await User.findById(merchantId).select('role mainMerchantId active');
    if (!merchant || !merchant.active || !isSubmerchantRole(merchant.role)) {
      return NextResponse.json({ error: 'Selected submerchant is invalid' }, { status: 400 });
    }

    const actorRole = normalizeRole(auth.user.role);
    if (isMarketerRole(actorRole) && auth.user.mainMerchantId) {
      if (merchant.mainMerchantId?.toString?.() !== auth.user.mainMerchantId.toString()) {
        return NextResponse.json({ error: 'You can only create orders for your main merchant submerchants' }, { status: 403 });
      }
    }

    const calculated = await buildOrderDetails(itemsPayload, governorate, merchantId);
    await reserveProductStock(calculated.stockAdjustments);

    let order: any;
    try {
      order = await Order.create({
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
    } catch (createError) {
      await restoreProductStock(calculated.stockAdjustments);
      throw createError;
    }

    await createNotificationsForUsers({
      userIds: [merchantId],
      type: 'new_order',
      title: `New order ${order.orderNumber}`,
      body: `A new order was submitted by marketer ${auth.user.name || ''}.`,
      href: `/admin/orders/${order._id}`,
      metadata: {
        orderId: order._id?.toString?.(),
        orderNumber: order.orderNumber,
        source: 'order_created',
      },
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
