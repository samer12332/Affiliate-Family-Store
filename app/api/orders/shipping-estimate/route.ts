import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Product, ShippingSystem, User } from '@/lib/models';
import { isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

function normalize(text: string) {
  return String(text || '').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const { items, governorate, merchantId } = body;

    if (!Array.isArray(items) || items.length === 0 || !governorate || !merchantId) {
      return NextResponse.json(
        { error: 'items, merchantId and governorate are required' },
        { status: 400 }
      );
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

    let shippingFee = 0;
    let sharedShippingSystemId = '';
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

      const currentShippingSystemId = String(product.shippingSystemId || '');
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
