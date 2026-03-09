import { connectDB } from '@/lib/db';
import { Product, ShippingSystem } from '@/lib/models';
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { cartItems, governorate } = body;

    if (!Array.isArray(cartItems) || cartItems.length === 0 || !governorate) {
      return NextResponse.json(
        { error: 'cartItems and governorate are required' },
        { status: 400 }
      );
    }

    let shippingFee = 0;

    for (const cartItem of cartItems) {
      const product = await resolveCartProduct(cartItem);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${cartItem.productId} not found` },
          { status: 404 }
        );
      }

      const shippingSystem = await resolveProductShippingSystem(product);
      if (!shippingSystem) {
        return NextResponse.json(
          { error: `Product "${product.name}" does not have an assigned shipping system` },
          { status: 400 }
        );
      }

      const matched = shippingSystem.governorateFees.find(
        (entry: any) => normalize(entry.governorate) === normalize(governorate)
      );

      if (!matched) {
        return NextResponse.json(
          {
            error: `No shipping fee configured for "${product.name}" to governorate "${governorate}" in shipping system "${shippingSystem.name}"`,
          },
          { status: 400 }
        );
      }

      const fee = Number(matched.fee);
      if (!Number.isFinite(fee) || fee < 0) {
        return NextResponse.json(
          {
            error: `Invalid shipping fee for "${product.name}" in shipping system "${shippingSystem.name}"`,
          },
          { status: 400 }
        );
      }

      shippingFee += fee * Number(cartItem.quantity || 1);
    }

    return NextResponse.json({ shippingFee });
  } catch (error: any) {
    console.error('[v0] Shipping estimate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to estimate shipping' },
      { status: 500 }
    );
  }
}
