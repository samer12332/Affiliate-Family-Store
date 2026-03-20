import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import { safeTrim, validateEmail } from '@/lib/validation';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const requestIp = getRequestIp('unknown', request.headers.get('x-forwarded-for'));
    const rate = checkRateLimit(`register-marketer:${requestIp}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many registration attempts. Try again shortly.' }, { status: 429 });
    }

    const body = await request.json();
    const name = safeTrim(body?.name, 120);
    const email = safeTrim(body?.email, 254).toLowerCase();
    const password = String(body?.password || '');
    const phone = safeTrim(body?.phone, 30);

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }
    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 6 and 128 characters' }, { status: 400 });
    }

    const existing = await User.findOne({ email }).select('_id');
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const user = await User.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10),
      role: 'marketer',
      active: true,
      mainMerchantId: null,
      createdByUserId: null,
      marketerProfile: {
        phone,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: 'marketer',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[v0] Marketer registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register marketer account' },
      { status: 500 }
    );
  }
}

