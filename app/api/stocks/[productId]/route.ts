import { canManageMerchantResource, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { isValidObjectId } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { productId } = await params;
    if (!isValidObjectId(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const body = await request.json();
    const nextStock = Number(body?.stock);

    if (!Number.isInteger(nextStock) || nextStock < 0 || nextStock > 1_000_000) {
      return NextResponse.json({ error: 'Stock must be a non-negative integer' }, { status: 400 });
    }

    const product = await Product.findById(productId).select('merchantId stock name slug');
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const canManage = await canManageMerchantResource(auth.user, product.merchantId.toString());
    if (!canManage) {
      return NextResponse.json({ error: 'You cannot edit stock for this product' }, { status: 403 });
    }

    product.stock = nextStock;
    await product.save();

    return NextResponse.json({
      item: {
        id: product._id?.toString?.() || product._id,
        name: product.name || '',
        slug: product.slug || '',
        stock: Number(product.stock || 0),
      },
    });
  } catch (error: any) {
    console.error('[v0] Stock update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update stock' },
      { status: 500 }
    );
  }
}
