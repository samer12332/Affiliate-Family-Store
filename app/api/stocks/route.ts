import { canManageMerchantResource, getManagedSubmerchantIds, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { escapeRegex, isValidObjectId, parsePositiveInt, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const search = safeTrim(searchParams.get('search') || '', 120);
    const merchantIdParam = String(searchParams.get('merchantId') || '').trim();
    const limit = parsePositiveInt(searchParams.get('limit'), 20, 100);
    const page = parsePositiveInt(searchParams.get('page'), 1, 5000);
    const skip = (page - 1) * limit;

    const query: any = {};
    const actorRole = normalizeRole(auth.user.role);

    if (isSubmerchantRole(actorRole)) {
      query.merchantId = auth.user._id;
    } else if (isMainMerchantRole(actorRole)) {
      const managedIds = await getManagedSubmerchantIds(auth.user._id.toString());
      query.merchantId = { $in: managedIds };
    }

    if (merchantIdParam) {
      if (!isValidObjectId(merchantIdParam)) {
        return NextResponse.json({ error: 'Invalid submerchant ID' }, { status: 400 });
      }
      const canUseMerchantFilter = await canManageMerchantResource(auth.user, merchantIdParam);
      if (!canUseMerchantFilter && !isAdminRole(actorRole)) {
        return NextResponse.json({ error: 'You cannot view stock for this submerchant' }, { status: 403 });
      }
      query.merchantId = merchantIdParam;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { slug: { $regex: safeSearch, $options: 'i' } },
        { sku: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('name slug merchantId stock availabilityStatus category shippingSystemId')
        .populate({ path: 'merchantId', select: 'name email merchantProfile.storeName' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      items: products.map((product: any) => ({
        id: product._id?.toString?.() || product._id,
        name: product.name || '',
        slug: product.slug || '',
        stock: Number(product.stock || 0),
        availabilityStatus: product.availabilityStatus || 'Available',
        category: product.category || '',
        merchant: product.merchantId
          ? {
              id: product.merchantId._id?.toString?.() || product.merchantId._id,
              name: product.merchantId.merchantProfile?.storeName || product.merchantId.name || '',
              email: product.merchantId.email || '',
            }
          : null,
      })),
      total,
      pagination: {
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error('[v0] Stock list API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load stock list' },
      { status: 500 }
    );
  }
}
