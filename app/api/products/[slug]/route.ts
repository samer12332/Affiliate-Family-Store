import { connectDB } from '@/lib/db';
import { Product, ShippingSystem } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const decoded = decodeURIComponent(slug || '').trim();

    let product = await Product.findOne({ slug: decoded.toLowerCase() });

    // Backward-compat fallback: if slug lookup misses but value is an ObjectId, try by id.
    if (!product && mongoose.Types.ObjectId.isValid(decoded)) {
      product = await Product.findById(decoded);
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
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
    const { slug } = await params;
    const decoded = decodeURIComponent(slug || '').trim();
    const body = await request.json();

    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.slug !== undefined && String(body.slug).trim().length > 0) {
      update.slug = String(body.slug).toLowerCase().trim();
    }
    if (body.price !== undefined) update.price = Number(body.price);
    if (body.category !== undefined) update.category = body.category;
    if (body.gender !== undefined) update.gender = body.gender;
    if (body.colors !== undefined) {
      update.colors = Array.isArray(body.colors)
        ? body.colors.map((c: any) => String(c).trim()).filter((c: string) => c.length > 0)
        : [];
    }
    if (body.sizeWeightChart !== undefined) {
      const normalizedSizeWeightChart = Array.isArray(body.sizeWeightChart)
        ? body.sizeWeightChart
            .map((entry: any) => ({
              size: String(entry?.size || '').trim(),
              minWeightKg: Number(entry?.minWeightKg),
              maxWeightKg: Number(entry?.maxWeightKg),
            }))
            .filter((entry: any) =>
              entry.size.length > 0 &&
              Number.isFinite(entry.minWeightKg) &&
              Number.isFinite(entry.maxWeightKg) &&
              entry.minWeightKg >= 0 &&
              entry.maxWeightKg >= entry.minWeightKg
            )
        : [];

      update.sizeWeightChart = normalizedSizeWeightChart;
      update.sizes = Array.from(new Set(normalizedSizeWeightChart.map((entry: any) => entry.size)));
    }
    if (body.description !== undefined) update.description = body.description || '';
    if (body.images !== undefined) update.images = Array.isArray(body.images) ? body.images : [];
    if (body.availabilityStatus !== undefined) update.availabilityStatus = body.availabilityStatus;
    if (body.featured !== undefined) update.featured = Boolean(body.featured);
    if (body.onSale !== undefined) update.onSale = Boolean(body.onSale);
    if (body.shippingSystemId !== undefined) {
      const shippingSystem = await ShippingSystem.findById(body.shippingSystemId);
      if (!shippingSystem) {
        return NextResponse.json({ error: 'Invalid shipping system' }, { status: 400 });
      }
      update.shippingSystemId = body.shippingSystemId;
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(decoded)) {
      product = await Product.findByIdAndUpdate(decoded, update, { new: true });
    }

    if (!product) {
      product = await Product.findOneAndUpdate({ slug: decoded.toLowerCase() }, update, { new: true });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
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
    const { slug } = await params;
    const decoded = decodeURIComponent(slug || '').trim();

    let product = null;
    if (mongoose.Types.ObjectId.isValid(decoded)) {
      product = await Product.findByIdAndDelete(decoded);
    }

    if (!product) {
      product = await Product.findOneAndDelete({ slug: decoded.toLowerCase() });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Product delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
