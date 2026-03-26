import { canManageMerchantResource, getAuthUser, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { ShippingSystem, User } from '@/lib/models';
import { isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId, parsePositiveInt, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

async function ensureShippingSystemIndexes() {
  const indexes = await ShippingSystem.collection.indexes();
  const legacyNameIndex = indexes.find((entry: any) => entry.name === 'name_1' && entry.unique);
  if (legacyNameIndex) {
    await ShippingSystem.collection.dropIndex('name_1');
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await ensureShippingSystemIndexes();

    const authUser = await getAuthUser(request);
    const searchParams = request.nextUrl.searchParams;
    const merchantId = searchParams.get('merchantId');
    const limit = parsePositiveInt(searchParams.get('limit'), 50, 100);
    const page = parsePositiveInt(searchParams.get('page'), 1, 5000);
    const skip = (page - 1) * limit;

    const query: any = {};
    const actorRole = normalizeRole(authUser?.role);
    if (merchantId) {
      if (!isValidObjectId(merchantId)) {
        return NextResponse.json({ error: 'Invalid submerchant ID' }, { status: 400 });
      }
      if (authUser && isMarketerRole(actorRole) && authUser.mainMerchantId) {
        const merchant = await User.findById(merchantId).select('mainMerchantId role active');
        const allowed =
          merchant &&
          merchant.active &&
          isSubmerchantRole(merchant.role) &&
          merchant.mainMerchantId?.toString?.() === authUser.mainMerchantId.toString();
        if (!allowed) {
          return NextResponse.json({ error: 'You cannot access this submerchant shipping systems' }, { status: 403 });
        }
      }
      query.merchantId = merchantId;
    } else if (authUser && isSubmerchantRole(actorRole)) {
      query.merchantId = authUser._id;
    } else if (authUser && isMainMerchantRole(actorRole)) {
      const submerchantIds = await User.find({
        role: { $in: ['submerchant', 'merchant'] },
        mainMerchantId: authUser._id,
        active: true,
      }).distinct('_id');
      query.merchantId = { $in: submerchantIds };
    } else if (authUser && isMarketerRole(actorRole) && authUser.mainMerchantId) {
      const submerchantIds = await User.find({
        role: { $in: ['submerchant', 'merchant'] },
        mainMerchantId: authUser.mainMerchantId,
        active: true,
      }).distinct('_id');
      query.merchantId = { $in: submerchantIds };
    }

    const [systems, total] = await Promise.all([
      ShippingSystem.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip),
      ShippingSystem.countDocuments(query),
    ]);

    const merchantIds = [...new Set(systems.map((entry: any) => entry.merchantId?.toString?.()).filter(Boolean))];
    const merchants = await User.find({ _id: { $in: merchantIds } }).select('_id name email merchantProfile');
    const merchantMap = new Map(merchants.map((entry: any) => [entry._id.toString(), entry]));

    const shippingSystems = systems.map((entry: any) => {
      const merchant = merchantMap.get(entry.merchantId?.toString?.() || '');
      return {
        ...entry.toObject(),
        submerchant: merchant
          ? {
              id: merchant._id?.toString?.() || null,
              name: merchant.merchantProfile?.storeName || merchant.name || '',
              email: merchant.email || '',
            }
          : null,
      };
    });

    return NextResponse.json({
      shippingSystems,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Shipping systems API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping systems' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    await ensureShippingSystemIndexes();
    const auth = await requireRole(request, ['owner', 'admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const merchantId = String(body?.merchantId || auth.user._id).trim();
    if (!isValidObjectId(merchantId)) {
      return NextResponse.json({ error: 'Invalid merchant reference' }, { status: 400 });
    }
    if (!(await canManageMerchantResource(auth.user, merchantId))) {
      return NextResponse.json({ error: 'You cannot manage shipping for this merchant' }, { status: 403 });
    }

    const normalizedFees = Array.isArray(body?.governorateFees)
      ? body.governorateFees
          .map((entry: any) => ({
            governorate: String(entry?.governorate || '').trim(),
            fee: Number(entry?.fee),
            estimatedDays: Number(entry?.estimatedDays || 0),
          }))
          .filter(
            (entry: any) =>
              EGYPTIAN_GOVERNORATES.includes(entry.governorate) &&
              Number.isFinite(entry.fee) &&
              entry.fee >= 0
          )
      : [];

    const name = safeTrim(body?.name, 100);
    if (!name || normalizedFees.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shippingSystem = await ShippingSystem.create({
      merchantId,
      name,
      governorateFees: normalizedFees,
      notes: safeTrim(body?.notes, 2000),
      active: body?.active !== false,
    });

    return NextResponse.json({ shippingSystem }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Shipping system creation error:', error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'A shipping system with this name already exists. Please use a different name.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping system' },
      { status: 500 }
    );
  }
}
