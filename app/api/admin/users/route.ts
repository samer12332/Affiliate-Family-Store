import { requireRole, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } from '@/lib/constants';
import { User } from '@/lib/models';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

async function ensureOwner() {
  const normalizedEmail = OWNER_EMAIL.toLowerCase();
  let owner = await User.findOne({ email: normalizedEmail });
  if (!owner) {
    owner = await User.create({
      name: OWNER_NAME,
      email: normalizedEmail,
      password: await bcryptjs.hash(OWNER_PASSWORD, 10),
      role: 'owner',
      active: true,
      isProtected: true,
      merchantProfile: {
        storeName: OWNER_NAME,
        slug: 'samer-owner',
      },
    });
  }

  return owner;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await ensureOwner();

    const auth = await requireRole(request, ['owner', 'super_admin', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (role) {
      query.role = role;
    }

    if (auth.user.role === 'merchant') {
      query.role = 'marketer';
    }

    if (auth.user.role === 'marketer') {
      query.role = 'merchant';
      query.active = true;
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      users: users.map(sanitizeUser),
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Users API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const role = String(body?.role || '');
    const active = body?.active !== false;

    if (!name || !email || !password || !['merchant', 'marketer', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid user payload' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const user = await User.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10),
      role,
      active,
      merchantProfile:
        role === 'merchant'
          ? {
              storeName: String(body?.storeName || name).trim(),
              slug: String(body?.storeSlug || name)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-'),
              phone: String(body?.phone || '').trim(),
            }
          : undefined,
      marketerProfile:
        role === 'marketer'
          ? {
              phone: String(body?.phone || '').trim(),
              notes: String(body?.notes || '').trim(),
            }
          : undefined,
    });

    return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] User creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
