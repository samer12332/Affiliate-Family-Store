import { canManageMerchantResource, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { ShippingSystem } from '@/lib/models';
import { isAdminRole } from '@/lib/roles';
import { isValidObjectId, safeTrim } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid shipping system ID' }, { status: 400 });
    }
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    if (!isAdminRole(auth.user.role)) {
      const merchantId = shippingSystem.merchantId?.toString?.();
      if (!merchantId) {
        return NextResponse.json({ error: 'Shipping system is missing merchant owner' }, { status: 400 });
      }
      if (!(await canManageMerchantResource(auth.user, merchantId))) {
        return NextResponse.json({ error: 'You cannot access this shipping system' }, { status: 403 });
      }
    }

    return NextResponse.json({ shippingSystem });
  } catch (error: any) {
    console.error('[v0] Shipping system API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping system' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid shipping system ID' }, { status: 400 });
    }
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    if (!isAdminRole(auth.user.role)) {
      const merchantId = shippingSystem.merchantId?.toString?.();
      if (!merchantId) {
        return NextResponse.json({ error: 'Shipping system is missing merchant owner' }, { status: 400 });
      }

      if (!(await canManageMerchantResource(auth.user, merchantId))) {
        return NextResponse.json({ error: 'You cannot edit this shipping system' }, { status: 403 });
      }
    }

    const body = await request.json();
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

    const updated = await ShippingSystem.findByIdAndUpdate(
      id,
      {
        name,
        governorateFees: normalizedFees,
        notes: safeTrim(body?.notes, 2000),
        active: body?.active !== false,
      },
      { new: true }
    );

    return NextResponse.json({ shippingSystem: updated });
  } catch (error: any) {
    console.error('[v0] Shipping system update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update shipping system' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid shipping system ID' }, { status: 400 });
    }
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    if (!isAdminRole(auth.user.role)) {
      const merchantId = shippingSystem.merchantId?.toString?.();
      if (!merchantId) {
        return NextResponse.json({ error: 'Shipping system is missing merchant owner' }, { status: 400 });
      }

      if (!(await canManageMerchantResource(auth.user, merchantId))) {
        return NextResponse.json({ error: 'You cannot delete this shipping system' }, { status: 403 });
      }
    }

    await ShippingSystem.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Shipping system delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete shipping system' },
      { status: 500 }
    );
  }
}
