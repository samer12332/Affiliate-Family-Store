import { requireRole, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } from '@/lib/constants';
import { User } from '@/lib/models';
import { isAdminRole, isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId, parsePositiveInt, safeTrim, validateEmail } from '@/lib/validation';
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

    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer']);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const role = normalizeRole(searchParams.get('role'));
    const limit = parsePositiveInt(searchParams.get('limit'), 100, 200);
    const page = parsePositiveInt(searchParams.get('page'), 1, 5000);
    const skip = (page - 1) * limit;
    const actorRole = normalizeRole(auth.user.role);

    const query: any = {};
    if (role) {
      query.role = role === 'submerchant' ? { $in: ['submerchant', 'merchant'] } : role;
    }

    if (isMainMerchantRole(actorRole)) {
      query.$or = [{ _id: auth.user._id }, { mainMerchantId: auth.user._id }];
    }

    if (isSubmerchantRole(actorRole)) {
      query._id = auth.user._id;
    }

    let legacyMainMerchantIds: string[] = [];

    if (isMarketerRole(actorRole)) {
      query.role = { $in: ['submerchant', 'merchant'] };
      query.active = true;
      if (auth.user.mainMerchantId) {
        query.mainMerchantId = auth.user.mainMerchantId;
      }

      // Exclude any legacy "merchant" accounts that are actually acting as main merchants.
      legacyMainMerchantIds = (await User.distinct('mainMerchantId', { mainMerchantId: { $ne: null } }))
        .filter(Boolean)
        .map((id: any) => id?.toString?.() || String(id));

      if (legacyMainMerchantIds.length > 0) {
        query._id = { $nin: legacyMainMerchantIds };
      }
    }

    if (isAdminRole(actorRole)) {
      delete query.$or;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('_id name email role active isProtected mainMerchantId createdByUserId merchantProfile marketerProfile createdAt')
        .lean(),
      User.countDocuments(query),
    ]);

    const filteredUsers =
      isMarketerRole(actorRole) && legacyMainMerchantIds.length > 0
        ? users.filter((entry: any) => !legacyMainMerchantIds.includes(entry._id?.toString?.() || String(entry._id)))
        : users;

    return NextResponse.json({
      users: filteredUsers.map(sanitizeUser),
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
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const name = safeTrim(body?.name, 120);
    const email = safeTrim(body?.email, 254).toLowerCase();
    const password = String(body?.password || '');
    const role = normalizeRole(String(body?.role || ''));
    const active = body?.active !== false;
    const actorRole = normalizeRole(auth.user.role);

    const allowedRoles = isMainMerchantRole(actorRole)
      ? ['submerchant', 'marketer']
      : actorRole === 'owner'
        ? ['admin', 'super_admin', 'main_merchant', 'submerchant', 'marketer']
        : ['main_merchant', 'submerchant', 'marketer'];

    if (!name || !email || !password || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid user payload' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    let mainMerchantId: string | null = null;
    if (isMainMerchantRole(actorRole)) {
      mainMerchantId = auth.user._id.toString();
    } else if (role === 'submerchant' || role === 'marketer') {
      const requestedMainMerchantId = String(body?.mainMerchantId || '').trim();
      if (requestedMainMerchantId) {
        if (!isValidObjectId(requestedMainMerchantId)) {
          return NextResponse.json({ error: 'Selected main merchant is invalid' }, { status: 400 });
        }
        const mainMerchant = await User.findById(requestedMainMerchantId);
        if (!mainMerchant || !isMainMerchantRole(mainMerchant.role)) {
          return NextResponse.json({ error: 'Selected main merchant is invalid' }, { status: 400 });
        }
        mainMerchantId = mainMerchant._id.toString();
      }
    }

    const user = await User.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10),
      role,
      active,
      mainMerchantId: role === 'submerchant' || role === 'marketer' ? mainMerchantId : null,
      createdByUserId: auth.user._id,
      merchantProfile:
        role === 'submerchant'
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
