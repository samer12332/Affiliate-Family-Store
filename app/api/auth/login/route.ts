import { requireAuth, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } from '@/lib/constants';
import { generateToken } from '@/server/utils/auth';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

async function ensureOwnerAccount() {
  const normalizedEmail = OWNER_EMAIL.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const hashedPassword = await bcryptjs.hash(OWNER_PASSWORD, 10);
    user = await User.create({
      name: OWNER_NAME,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'owner',
      isProtected: true,
      active: true,
      merchantProfile: {
        storeName: OWNER_NAME,
        slug: 'samer-owner',
      },
    });
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    await ensureOwnerAccount();

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcryptjs.compare(String(password), user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 401 });
    }

    const token = generateToken(user);

    return NextResponse.json({
      token,
      admin: {
        id: user._id.toString(),
        ...sanitizeUser(user),
      },
    });
  } catch (error: any) {
    console.error('[v0] Auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  await connectDB();
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({
    user: {
      id: auth.user._id.toString(),
      ...sanitizeUser(auth.user),
    },
  });
}
