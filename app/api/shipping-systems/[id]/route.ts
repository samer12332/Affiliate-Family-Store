import { connectDB } from '@/lib/db';
import { ShippingSystem } from '@/lib/models';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
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
    const { id } = await params;
    const body = await request.json();
    const { name, governorateFees, refusalPolicy, notes, active } = body;

    if (!name || !Array.isArray(governorateFees) || governorateFees.length === 0 || !refusalPolicy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedFees = governorateFees
      .map((entry: any) => ({
        governorate: String(entry.governorate || '').trim(),
        fee: Number(entry.fee),
      }))
      .filter((entry: any) =>
        EGYPTIAN_GOVERNORATES.includes(entry.governorate) && Number.isFinite(entry.fee) && entry.fee >= 0
      );

    if (normalizedFees.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid governorate fee is required' },
        { status: 400 }
      );
    }

    const shippingSystem = await ShippingSystem.findByIdAndUpdate(
      id,
      {
        name: String(name).trim(),
        governorateFees: normalizedFees,
        refusalPolicy,
        notes: notes || '',
        active: active !== false,
      },
      { new: true }
    );

    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    return NextResponse.json({ shippingSystem });
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
    const { id } = await params;

    const shippingSystem = await ShippingSystem.findByIdAndDelete(id);
    if (!shippingSystem) {
      return NextResponse.json({ error: 'Shipping system not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Shipping system delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete shipping system' },
      { status: 500 }
    );
  }
}
