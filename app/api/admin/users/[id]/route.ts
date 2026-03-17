import { requireRole, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'super_admin']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isProtected && auth.user.role !== 'owner') {
      return NextResponse.json({ error: 'Protected owner cannot be modified by this user' }, { status: 403 });
    }

    if (user.isProtected && body.role && body.role !== 'owner') {
      return NextResponse.json({ error: 'Protected owner role cannot be changed' }, { status: 400 });
    }

    if (user.isProtected && body.active === false) {
      return NextResponse.json({ error: 'Protected owner cannot be deactivated' }, { status: 400 });
    }

    const update: any = {};

    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.active !== undefined) update.active = Boolean(body.active);
    if (body.role !== undefined) {
      if (!['owner', 'super_admin', 'merchant', 'marketer'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      update.role = body.role;
    }

    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      update.password = await bcryptjs.hash(String(body.password), 10);
    }

    if (body.storeName !== undefined || body.storeSlug !== undefined || body.phone !== undefined) {
      update.merchantProfile = {
        ...(user.merchantProfile || {}),
        ...(body.storeName !== undefined ? { storeName: String(body.storeName).trim() } : {}),
        ...(body.storeSlug !== undefined
          ? {
              slug: String(body.storeSlug)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-'),
            }
          : {}),
        ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
      };
    }

    const updated = await User.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (error: any) {
    console.error('[v0] User update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
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
    const auth = await requireRole(request, ['owner', 'super_admin']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isProtected) {
      return NextResponse.json({ error: 'Protected owner cannot be deleted' }, { status: 403 });
    }

    if (auth.user._id.toString() === user._id.toString()) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] User delete API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
