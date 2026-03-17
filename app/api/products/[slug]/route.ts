import { canManageMerchantResource, getAuthUser, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Product, ShippingSystem } from '@/lib/models';
import { isMainMerchantRole } from '@/lib/roles';
import { isValidObjectId, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

async function findProduct(decoded: string) {
  let product = await Product.findOne({ slug: decoded.toLowerCase() });
  if (!product && mongoose.Types.ObjectId.isValid(decoded)) {
    product = await Product.findById(decoded);
  }

  return product;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const product = await findProduct(decodeURIComponent(slug || '').trim());

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('[v0] Product API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }
    if (isMainMerchantRole(auth.user.role)) {
      return NextResponse.json({ error: 'Main merchants cannot edit products. Only submerchants can edit products.' }, { status: 403 });
    }

    const { slug } = await params;
    const decoded = decodeURIComponent(slug || '').trim();
    const product = await findProduct(decoded);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!(await canManageMerchantResource(auth.user, product.merchantId.toString()))) {
      return NextResponse.json({ error: 'You cannot edit this product' }, { status: 403 });
    }

    const body = await request.json();
    const update: any = {};
    if (body.name !== undefined) {
      const nextName = safeTrim(body.name, 160);
      if (!nextName) {
        return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
      }
      update.name = nextName;
    }
    if (body.slug !== undefined && String(body.slug).trim()) update.slug = String(body.slug).trim().toLowerCase();
    if (body.merchantPrice !== undefined || body.price !== undefined) {
      const merchantPrice = Number(body.merchantPrice ?? body.price);
      if (!Number.isFinite(merchantPrice) || merchantPrice < 0 || merchantPrice > 1_000_000) {
        return NextResponse.json({ error: 'Valid merchant price is required' }, { status: 400 });
      }
      update.merchantPrice = merchantPrice;
      update.price = merchantPrice;
    }
    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
        return NextResponse.json({ error: 'Valid stock quantity is required' }, { status: 400 });
      }
      update.stock = stock;
    }
    if (body.suggestedCommission !== undefined) {
      update.suggestedCommission =
        body.suggestedCommission === '' || body.suggestedCommission === null
          ? null
          : Number(body.suggestedCommission);
    }
    if (body.category !== undefined) update.category = body.category;
    if (body.gender !== undefined) update.gender = body.gender;
    if (body.category !== undefined && !['Clothes', 'Shoes', 'Others'].includes(String(body.category))) {
      return NextResponse.json({ error: 'Invalid category value' }, { status: 400 });
    }
    if (body.gender !== undefined && !['Men', 'Women', 'Children', 'Unisex'].includes(String(body.gender))) {
      return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 });
    }
    if (body.description !== undefined) update.description = safeTrim(body.description, 4000);
    if (body.images !== undefined) update.images = Array.isArray(body.images) ? body.images.slice(0, 20) : [];
    if (body.availabilityStatus !== undefined) update.availabilityStatus = body.availabilityStatus;
    if (body.featured !== undefined) update.featured = Boolean(body.featured);
    if (body.onSale !== undefined) update.onSale = Boolean(body.onSale);
    if (body.colors !== undefined) {
      update.colors = Array.isArray(body.colors)
        ? body.colors.map((value: any) => String(value).trim()).filter(Boolean)
        : [];
    }
    if (body.sizeWeightChart !== undefined) {
      const sizeWeightChart = Array.isArray(body.sizeWeightChart)
        ? body.sizeWeightChart
            .map((entry: any) => ({
              size: String(entry?.size || '').trim(),
              minWeightKg: Number(entry?.minWeightKg),
              maxWeightKg: Number(entry?.maxWeightKg),
            }))
            .filter((entry: any) => entry.size && Number.isFinite(entry.minWeightKg) && Number.isFinite(entry.maxWeightKg))
        : [];
      update.sizeWeightChart = sizeWeightChart;
      update.sizes = Array.isArray(body.sizes)
        ? body.sizes.map((value: any) => String(value).trim()).filter(Boolean)
        : sizeWeightChart.map((entry: any) => entry.size);
    }
    if (body.shippingSystemId !== undefined) {
      const shippingSystemId = String(body.shippingSystemId || '').trim();
      if (!shippingSystemId || !isValidObjectId(shippingSystemId)) {
        return NextResponse.json({ error: 'A valid shipping system is required' }, { status: 400 });
      }

      const shippingSystem = await ShippingSystem.findById(shippingSystemId);
      if (!shippingSystem) {
        return NextResponse.json({ error: 'Invalid shipping system' }, { status: 400 });
      }

      if (shippingSystem.merchantId.toString() !== product.merchantId.toString()) {
        return NextResponse.json({ error: 'Shipping system does not belong to this merchant' }, { status: 400 });
      }
      update.shippingSystemId = shippingSystemId;
    }

    const updated = await Product.findByIdAndUpdate(product._id, update, { new: true });
    return NextResponse.json({ product: updated });
  } catch (error: any) {
    console.error('[v0] Product update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }
    if (isMainMerchantRole(auth.user.role)) {
      return NextResponse.json({ error: 'Main merchants cannot delete products. Only submerchants can delete products.' }, { status: 403 });
    }

    const { slug } = await params;
    const product = await findProduct(decodeURIComponent(slug || '').trim());
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!(await canManageMerchantResource(auth.user, product.merchantId.toString()))) {
      return NextResponse.json({ error: 'You cannot delete this product' }, { status: 403 });
    }

    await Product.findByIdAndDelete(product._id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Product delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
