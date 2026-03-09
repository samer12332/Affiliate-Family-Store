import { connectDB } from '@/lib/db';
import { AdminUser } from '@/lib/models';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const user = await AdminUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const update: any = {};

    if (body.role !== undefined) {
      if (!['admin', 'moderator'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      update.role = body.role;
    }

    if (body.active !== undefined) {
      const nextActive = Boolean(body.active);

      // Prevent disabling the final active admin account.
      const nextRole = update.role || user.role;
      if (!nextActive && nextRole === 'admin') {
        const otherActiveAdmins = await AdminUser.countDocuments({
          _id: { $ne: user._id },
          role: 'admin',
          active: true,
        });
        if (otherActiveAdmins === 0) {
          return NextResponse.json(
            { error: 'Cannot deactivate the last active admin user' },
            { status: 400 }
          );
        }
      }

      update.active = nextActive;
    }

    if (body.password !== undefined) {
      const password = String(body.password || '');
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      update.password = await bcryptjs.hash(password, 10);
    }

    const updated = await AdminUser.findByIdAndUpdate(id, update, { new: true })
      .select('email role active createdAt');

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error('[v0] Admin user update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update admin user' },
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

    const user = await AdminUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the final active admin account.
    if (user.role === 'admin' && user.active) {
      const otherActiveAdmins = await AdminUser.countDocuments({
        _id: { $ne: user._id },
        role: 'admin',
        active: true,
      });
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot delete the last active admin user' },
          { status: 400 }
        );
      }
    }

    await AdminUser.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Admin user delete API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}
