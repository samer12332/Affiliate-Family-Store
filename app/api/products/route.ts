import { canManageMerchantResource, getAuthUser, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Product, ShippingSystem, User } from '@/lib/models';
import { isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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

  while (await Product.findOne({ slug: candidate })) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function getLegacyMainMerchantIds() {
  return (await User.distinct('mainMerchantId', { mainMerchantId: { $ne: null } }))
    .filter(Boolean)
    .map((id: any) => id?.toString?.() || String(id));
}

async function getEligibleSubmerchantIds(mainMerchantId?: any) {
  const legacyMainMerchantIds = await getLegacyMainMerchantIds();
  const query: any = {
    active: true,
    $or: [
      { role: 'submerchant' },
      { role: 'merchant', _id: { $nin: legacyMainMerchantIds } },
    ],
  };

  if (mainMerchantId) {
    query.mainMerchantId = mainMerchantId;
  }

  return (await User.find(query).distinct('_id')).map((id: any) => id?.toString?.() || String(id));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(request);
    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get('featured') === 'true';
    const category = searchParams.get('category');
    const gender = searchParams.get('gender');
    const search = searchParams.get('search');
    const merchantIdParam = searchParams.get('merchantId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (featured) query.featured = true;
    if (category) query.category = category;
    if (gender) query.gender = gender;
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }];
    }

    const actorRole = normalizeRole(authUser?.role);

    if (merchantIdParam) {
      if (authUser && isMarketerRole(actorRole)) {
        const eligibleIds = await getEligibleSubmerchantIds(authUser.mainMerchantId || undefined);
        if (!eligibleIds.includes(String(merchantIdParam))) {
          return NextResponse.json({ error: 'You cannot access this submerchant products' }, { status: 403 });
        }
      }

      query.merchantId = merchantIdParam;
    } else if (authUser && isSubmerchantRole(actorRole)) {
      query.merchantId = authUser._id;
    } else if (authUser && isMainMerchantRole(actorRole)) {
      const submerchantIds = await User.find({
        role: { $in: ['submerchant', 'merchant'] },
        mainMerchantId: authUser._id,
        active: true,
      }).distinct('_id');
      query.merchantId = { $in: submerchantIds };
    } else if (authUser && isMarketerRole(actorRole)) {
      const submerchantIds = await getEligibleSubmerchantIds(authUser.mainMerchantId || undefined);
      query.merchantId = { $in: submerchantIds };
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip),
      Product.countDocuments(query),
    ]);

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
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'submerchant', 'merchant', 'main_merchant']);
    if (!auth.ok) {
      return auth.response;
    }
    if (isMainMerchantRole(auth.user.role)) {
      return NextResponse.json({ error: 'Main merchants cannot create products. Only submerchants can create products.' }, { status: 403 });
    }

    const body = await request.json();
    const merchantId = String(body?.merchantId || auth.user._id);
    if (!(await canManageMerchantResource(auth.user, merchantId))) {
      return NextResponse.json({ error: 'You cannot create products for this merchant' }, { status: 403 });
    }

    const shippingSystemId = String(body?.shippingSystemId || '').trim();
    if (!shippingSystemId || !mongoose.Types.ObjectId.isValid(shippingSystemId)) {
      return NextResponse.json({ error: 'A valid shipping system is required' }, { status: 400 });
    }

    const shippingSystem = await ShippingSystem.findById(shippingSystemId);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Invalid shipping system' }, { status: 400 });
    }

    if (shippingSystem.merchantId.toString() !== merchantId) {
      return NextResponse.json({ error: 'Shipping system does not belong to this merchant' }, { status: 400 });
    }

    const merchant = await User.findById(merchantId);
    if (!merchant || !isSubmerchantRole(merchant.role)) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const merchantPrice = Number(body?.merchantPrice ?? body?.price);
    if (!Number.isFinite(merchantPrice) || merchantPrice < 0) {
      return NextResponse.json({ error: 'Valid merchant price is required' }, { status: 400 });
    }
    const stock = Number(body?.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: 'Valid stock quantity is required' }, { status: 400 });
    }
    const suggestedCommission =
      body?.suggestedCommission === '' || body?.suggestedCommission === null || body?.suggestedCommission === undefined
        ? null
        : Number(body.suggestedCommission);
    if (suggestedCommission !== null && (!Number.isFinite(suggestedCommission) || suggestedCommission < 0)) {
      return NextResponse.json({ error: 'Suggested commission must be a valid positive number' }, { status: 400 });
    }

    const finalSlug = await generateUniqueSlug(String(body?.slug || body?.name));
    const sizeWeightChart = Array.isArray(body?.sizeWeightChart)
      ? body.sizeWeightChart
          .map((entry: any) => ({
            size: String(entry?.size || '').trim(),
            minWeightKg: Number(entry?.minWeightKg),
            maxWeightKg: Number(entry?.maxWeightKg),
          }))
          .filter((entry: any) => entry.size && Number.isFinite(entry.minWeightKg) && Number.isFinite(entry.maxWeightKg))
      : [];
    const sizes = Array.isArray(body?.sizes)
      ? body.sizes.map((value: any) => String(value).trim()).filter(Boolean)
      : sizeWeightChart.map((entry: any) => entry.size);

    const product = await Product.create({
      merchantId,
      name: String(body?.name || '').trim(),
      slug: finalSlug,
      merchantPrice,
      stock,
      suggestedCommission,
      price: merchantPrice,
      category: body?.category,
      gender: body?.gender,
      colors: Array.isArray(body?.colors) ? body.colors.map((value: any) => String(value).trim()).filter(Boolean) : [],
      sizeWeightChart,
      sizes,
      shippingSystemId: shippingSystem._id,
      description: String(body?.description || ''),
      images: Array.isArray(body?.images) ? body.images.filter((img: any) => typeof img === 'string' && img) : [],
      availabilityStatus: body?.availabilityStatus || 'Available',
      featured: Boolean(body?.featured),
      onSale: Boolean(body?.onSale),
      brand: merchant.merchantProfile?.storeName || merchant.name,
      sku: String(body?.sku || '').trim(),
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
