import { connectDB } from '@/lib/db';
import { Product, ShippingSystem } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

function normalize(text: string) {
  return String(text || '').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { items, governorate, merchantId } = body;

    if (!Array.isArray(items) || items.length === 0 || !governorate || !merchantId) {
      return NextResponse.json(
        { error: 'items, merchantId and governorate are required' },
        { status: 400 }
      );
    }

    let shippingFee = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.merchantId.toString() !== String(merchantId)) {
        return NextResponse.json({ error: 'Invalid merchant product selection' }, { status: 400 });
      }

      const shippingSystem = await ShippingSystem.findById(product.shippingSystemId);
      if (!shippingSystem) {
        return NextResponse.json({ error: `No shipping system for "${product.name}"` }, { status: 400 });
      }

      const matched = shippingSystem.governorateFees.find(
        (entry: any) => normalize(entry.governorate) === normalize(governorate)
      );
      if (!matched) {
        return NextResponse.json(
          { error: `No shipping fee configured for governorate "${governorate}"` },
          { status: 400 }
        );
      }

      shippingFee += Number(matched.fee) * Math.max(1, Number(item.quantity || 1));
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
