import { requireAuth, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } from '@/lib/constants';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import { safeTrim, validateEmail } from '@/lib/validation';
import { generateToken } from '@/server/utils/auth';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

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

    const requestIp = getRequestIp('unknown', request.headers.get('x-forwarded-for'));
    const rate = checkRateLimit(`login:${requestIp}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again shortly.' }, { status: 429 });
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = safeTrim(email, 254).toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }
    if (String(password).length < 6 || String(password).length > 128) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const submittedPassword = String(password);
    const storedPassword = String(user.password || '');
    let isPasswordValid = false;

    if (BCRYPT_HASH_REGEX.test(storedPassword)) {
      isPasswordValid = await bcryptjs.compare(submittedPassword, storedPassword);
    } else {
      // Legacy fallback: if a plain-text password exists, migrate immediately to bcrypt hash.
      isPasswordValid = submittedPassword === storedPassword;
      if (isPasswordValid) {
        user.password = await bcryptjs.hash(submittedPassword, 10);
        await user.save();
      }
    }

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
