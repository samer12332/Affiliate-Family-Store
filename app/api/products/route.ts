import { connectDB } from '@/lib/db';
import { Product, ShippingSystem } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'product';
  let candidate = root;
  let counter = 2;

  // Ensure slug uniqueness by appending a numeric suffix when needed.
  while (await Product.findOne({ slug: candidate })) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get('featured') === 'true';
    const category = searchParams.get('category');
    const gender = searchParams.get('gender');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: any = {};
    const normalizeCategory = (value: string) => {
      const v = String(value || '').trim().toLowerCase();
      if (v === 'clothes') return 'Clothes';
      if (v === 'shoes') return 'Shoes';
      if (v === 'others' || v === 'accessories') return 'Others';
      return value;
    };
    const normalizeGender = (value: string) => {
      const v = String(value || '').trim().toLowerCase();
      if (v === 'men') return 'Men';
      if (v === 'women') return 'Women';
      if (v === 'children') return 'Children';
      if (v === 'unisex' || v === 'gender neutral' || v === 'gender-neutral') return 'Unisex';
      return value;
    };

    if (featured) query.featured = true;
    if (category) query.category = normalizeCategory(category);
    if (gender) query.gender = normalizeGender(gender);
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    return NextResponse.json({
      products,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Products API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      slug,
      price,
      category,
      gender,
      colors,
      sizeWeightChart,
      sizes,
      shippingSystemId,
      description,
      images,
      availabilityStatus,
      featured,
      onSale,
    } = body;

    if (!name || price === undefined || !category || !gender || !shippingSystemId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const shippingSystem = await ShippingSystem.findById(shippingSystemId);
    if (!shippingSystem) {
      return NextResponse.json(
        { error: 'Invalid shipping system' },
        { status: 400 }
      );
    }

    const finalSlug = await generateUniqueSlug(String(slug || name));
    const normalizedSizeWeightChart = Array.isArray(sizeWeightChart)
      ? sizeWeightChart
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
    const normalizedSizes =
      normalizedSizeWeightChart.length > 0
        ? Array.from(new Set(normalizedSizeWeightChart.map((entry: any) => entry.size)))
        : Array.isArray(sizes)
          ? sizes.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0)
          : [];

    const product = await Product.create({
      name: String(name).trim(),
      slug: finalSlug,
      price: Number(price),
      category,
      gender,
      colors: Array.isArray(colors)
        ? colors.map((c: any) => String(c).trim()).filter((c: string) => c.length > 0)
        : [],
      sizeWeightChart: normalizedSizeWeightChart,
      sizes: normalizedSizes,
      shippingSystemId,
      description: description || '',
      images: Array.isArray(images) ? images.filter((img) => typeof img === 'string' && img.length > 0) : [],
      availabilityStatus: availabilityStatus || 'Available',
      featured: Boolean(featured),
      onSale: Boolean(onSale),
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Product creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
