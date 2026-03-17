import { canManageMerchantResource, getAuthUser, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { ShippingSystem } from '@/lib/models';
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (merchantId) {
      query.merchantId = merchantId;
    } else if (authUser?.role === 'merchant') {
      query.merchantId = authUser._id;
    }

    const [systems, total] = await Promise.all([
      ShippingSystem.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip),
      ShippingSystem.countDocuments(query),
    ]);

    return NextResponse.json({
      shippingSystems: systems,
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
    const auth = await requireRole(request, ['owner', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const merchantId = String(body?.merchantId || auth.user._id);
    if (!canManageMerchantResource(auth.user, merchantId)) {
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

    if (!String(body?.name || '').trim() || normalizedFees.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shippingSystem = await ShippingSystem.create({
      merchantId,
      name: String(body.name).trim(),
      governorateFees: normalizedFees,
      notes: String(body?.notes || ''),
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
