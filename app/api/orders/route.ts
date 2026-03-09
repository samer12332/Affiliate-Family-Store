import { connectDB } from '@/lib/db';
import { Order, Product, ShippingSystem } from '@/lib/models';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

function normalize(text: string) {
  return String(text || '').trim().toLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveCartProduct(cartItem: any) {
  const byId = cartItem?.productId ? await Product.findById(cartItem.productId) : null;
  if (byId?.shippingSystemId) return byId;

  const normalizedSlug = normalize(cartItem?.productSlug);
  if (normalizedSlug) {
    const bySlug = await Product.findOne({ slug: normalizedSlug });
    if (bySlug?.shippingSystemId) return bySlug;
  }

  const normalizedName = normalize(cartItem?.productName);
  if (normalizedName) {
    const byName = await Product.findOne({ name: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i') }).sort({
      updatedAt: -1,
    });
    if (byName?.shippingSystemId) return byName;
  }

  return byId;
}

async function resolveProductShippingSystem(product: any) {
  if (product.shippingSystemId) {
    const assigned = await ShippingSystem.findById(product.shippingSystemId);
    if (assigned) return assigned;
  }

  // Auto-heal legacy products with missing assignment when there is only one active shipping system.
  const activeSystems = await ShippingSystem.find({ active: true }).sort({ createdAt: -1 });
  if (activeSystems.length === 1) {
    product.shippingSystemId = activeSystems[0]._id;
    await product.save();
    return activeSystems[0];
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;
    const query: any = {};

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      orders,
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

    const body = await request.json();
    const { cartItems, customerInfo, shippingAddress } = body;

    if (!cartItems || !customerInfo || !shippingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (!String(shippingAddress?.detailedAddress || '').trim()) {
      return NextResponse.json(
        { error: 'Detailed address is required' },
        { status: 400 }
      );
    }

    // Validate governorate
    const govList = EGYPTIAN_GOVERNORATES;
    if (!govList.includes(shippingAddress.governorate)) {
      return NextResponse.json(
        { error: 'Invalid governorate' },
        { status: 400 }
      );
    }

    // Build order items with snapshots and shipping-system rules
    const items = [];
    let subtotal = 0;
    let shippingFee = 0;

    for (const cartItem of cartItems) {
      const product = await resolveCartProduct(cartItem);

      if (!product) {
        return NextResponse.json(
          { error: `Product ${cartItem.productId} not found` },
          { status: 404 }
        );
      }

      const unitPrice = product.discountPrice || product.price;
      const itemTotal = unitPrice * cartItem.quantity;
      subtotal += itemTotal;

      let itemShippingFee = 0;
      let refusalPolicy: string | undefined;
      let shippingNotes: string | undefined;

      const shippingSystem = await resolveProductShippingSystem(product);
      if (!shippingSystem) {
        return NextResponse.json(
          { error: `Product "${product.name}" does not have an assigned shipping system` },
          { status: 400 }
        );
      }

      const matchedGovernorate = shippingSystem.governorateFees.find(
        (entry: any) => normalize(entry.governorate) === normalize(shippingAddress.governorate)
      );

      if (!matchedGovernorate) {
        return NextResponse.json(
          {
            error: `No shipping fee configured for "${product.name}" to governorate "${shippingAddress.governorate}" in shipping system "${shippingSystem.name}"`,
          },
          { status: 400 }
        );
      }

      itemShippingFee = Number(matchedGovernorate.fee);
      if (!Number.isFinite(itemShippingFee) || itemShippingFee < 0) {
        return NextResponse.json(
          {
            error: `Invalid shipping fee for "${product.name}" in shipping system "${shippingSystem.name}"`,
          },
          { status: 400 }
        );
      }
      refusalPolicy = shippingSystem.refusalPolicy;
      shippingNotes = shippingSystem.notes || '';

      shippingFee += itemShippingFee * cartItem.quantity;

      items.push({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        selectedColor: cartItem.color,
        selectedSize: cartItem.size,
        quantity: cartItem.quantity,
        unitPrice,
        productImage: product.images[0] || '',
        shippingFee: itemShippingFee,
        shippingSystemId: product.shippingSystemId || null,
        refusalPolicy,
        shippingNotes,
        supplierReference: product.supplierInfo?.reference || null,
        returnEligibility: product.returnPolicy?.eligible || false,
      });
    }

    const order = new Order({
      orderNumber: await generateOrderNumber(),
      customer: customerInfo,
      shippingAddress,
      items,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      status: 'Pending Review',
    });

    await order.save();

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
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

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const ordersToday = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  const sequence = String(ordersToday + 1).padStart(3, '0');
  return `FAM-${dateString}-${sequence}`;
}
