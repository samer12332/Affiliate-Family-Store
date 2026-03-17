import { canManageMerchantResource, requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { ShippingSystem } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
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
    const auth = await requireRole(request, ['owner', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    if (!canManageMerchantResource(auth.user, shippingSystem.merchantId.toString())) {
      return NextResponse.json({ error: 'You cannot edit this shipping system' }, { status: 403 });
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

    if (!String(body?.name || '').trim() || normalizedFees.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updated = await ShippingSystem.findByIdAndUpdate(
      id,
      {
        name: String(body.name).trim(),
        governorateFees: normalizedFees,
        notes: String(body?.notes || ''),
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
    const auth = await requireRole(request, ['owner', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const shippingSystem = await ShippingSystem.findById(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    if (!canManageMerchantResource(auth.user, shippingSystem.merchantId.toString())) {
      return NextResponse.json({ error: 'You cannot delete this shipping system' }, { status: 403 });
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
