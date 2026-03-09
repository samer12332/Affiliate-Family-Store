import { connectDB } from '@/lib/db';
import { ShippingSystem } from '@/lib/models';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const systems = await ShippingSystem.find({})
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });
    const total = await ShippingSystem.countDocuments({});

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

    const body = await request.json();
    const { name, governorateFees, refusalPolicy, notes, active } = body;

    if (!name || !Array.isArray(governorateFees) || governorateFees.length === 0 || !refusalPolicy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    const shippingSystem = await ShippingSystem.create({
      name: String(name).trim(),
      governorateFees: normalizedFees,
      refusalPolicy,
      notes: notes || '',
      active: active !== false,
    });

    return NextResponse.json({ shippingSystem }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Shipping system creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping system' },
      { status: 500 }
    );
  }
}
