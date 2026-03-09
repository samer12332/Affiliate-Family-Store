import { connectDB } from '@/lib/db';
import { AdminUser } from '@/lib/models';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '@/lib/constants';
import { generateToken } from '@/server/utils/auth';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let user = await AdminUser.findOne({ email: normalizedEmail });

    // Bootstrap default admin account on first login for fresh databases.
    if (!user && normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      const hashedPassword = await bcryptjs.hash(ADMIN_PASSWORD, 10);
      user = await AdminUser.create({
        email: ADMIN_EMAIL.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        active: true,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Support both hashed and legacy plain-text passwords.
    const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
    const isPasswordValid = isHashed
      ? await bcryptjs.compare(password, user.password)
      : password === user.password;

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 401 }
      );
    }

    const token = generateToken(user._id.toString());

    return NextResponse.json({
      token,
      admin: {
        id: user._id,
        email: user.email,
        role: user.role,
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
