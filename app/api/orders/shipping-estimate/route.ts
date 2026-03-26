import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { Product, ShippingSystem, User } from '@/lib/models';
import { isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

function normalize(text: string) {
  return String(text || '').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const governorate = safeTrim(body?.governorate, 80);
    const merchantId = String(body?.merchantId || '').trim();

    if (!Array.isArray(items) || items.length === 0 || !governorate || !merchantId) {
      return NextResponse.json(
        { error: 'items, merchantId and governorate are required' },
        { status: 400 }
      );
    }
    if (!isValidObjectId(merchantId)) {
      return NextResponse.json({ error: 'Invalid merchant reference' }, { status: 400 });
    }
    if (!EGYPTIAN_GOVERNORATES.includes(governorate)) {
      return NextResponse.json({ error: 'Invalid governorate selected' }, { status: 400 });
    }
    if (items.length > 100) {
      return NextResponse.json({ error: 'Too many items in one request' }, { status: 400 });
    }
    for (const item of items) {
      if (!isValidObjectId(String(item?.productId || ''))) {
        return NextResponse.json({ error: 'Invalid product reference in request' }, { status: 400 });
      }
    }

    const merchant = await User.findById(String(merchantId)).select('role mainMerchantId active');
    if (!merchant || !merchant.active || !isSubmerchantRole(merchant.role)) {
      return NextResponse.json({ error: 'Invalid submerchant selected' }, { status: 400 });
    }

    const actorRole = normalizeRole(auth.user.role);
    if (isMarketerRole(actorRole) && auth.user.mainMerchantId) {
      if (merchant.mainMerchantId?.toString?.() !== auth.user.mainMerchantId.toString()) {
        return NextResponse.json({ error: 'You cannot estimate shipping for this submerchant' }, { status: 403 });
      }
    }

    const normalizedGovernorate = normalize(governorate);
    const productIds = [...new Set(items.map((item: any) => String(item?.productId || '')))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id name merchantId shippingSystemId')
      .lean();
    const productMap = new Map(products.map((product: any) => [product._id.toString(), product]));
    if (productMap.size !== productIds.length) {
      return NextResponse.json({ error: 'Invalid merchant product selection' }, { status: 400 });
    }

    const shippingSystemIds = [
      ...new Set(products.map((product: any) => String(product.shippingSystemId || '')).filter(Boolean)),
    ];
    const shippingSystems = await ShippingSystem.find({ _id: { $in: shippingSystemIds } })
      .select('_id governorateFees')
      .lean();
    const shippingMap = new Map(shippingSystems.map((entry: any) => [entry._id.toString(), entry]));

    let shippingFee = 0;
    let sharedShippingSystemId = '';
    for (const item of items) {
      const product = productMap.get(String(item.productId));
      if (!product || String(product.merchantId) !== String(merchantId)) {
        return NextResponse.json({ error: 'Invalid merchant product selection' }, { status: 400 });
      }

      const currentShippingSystemId = String(product.shippingSystemId || '');
      const shippingSystem = shippingMap.get(currentShippingSystemId);
      if (!shippingSystem) {
        return NextResponse.json({ error: `No shipping system for "${product.name}"` }, { status: 400 });
      }

      const matched = (shippingSystem.governorateFees || []).find(
        (entry: any) => normalize(entry.governorate) === normalizedGovernorate
      );
      if (!matched) {
        return NextResponse.json(
          { error: `No shipping fee configured for governorate "${governorate}"` },
          { status: 400 }
        );
      }

      if (!sharedShippingSystemId) {
        sharedShippingSystemId = currentShippingSystemId;
        // Cart policy enforces one shipping system for the grouped merchant cart.
        shippingFee = Number(matched.fee);
      } else if (sharedShippingSystemId !== currentShippingSystemId) {
        return NextResponse.json(
          { error: 'All selected products must share the same shipping system' },
          { status: 400 }
        );
      }
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
