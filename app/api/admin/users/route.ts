import { connectDB } from '@/lib/db';
import { AdminUser } from '@/lib/models';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const users = await AdminUser.find({})
      .select('email role active createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AdminUser.countDocuments({});

    return NextResponse.json({
      users,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Admin users API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const role = body?.role === 'moderator' ? 'moderator' : 'admin';
    const active = body?.active !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existing = await AdminUser.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = await AdminUser.create({
      email,
      password: hashedPassword,
      role,
      active,
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[v0] Admin users create API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
