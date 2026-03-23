import { requireRole, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { syncMarketplaceProductSnapshotForMerchant } from '@/lib/product-marketplace';
import { isMainMerchantRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { isValidObjectId, safeTrim } from '@/lib/validation';
import bcryptjs from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const body = await request.json();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const actorRole = normalizeRole(auth.user.role);
    const targetRole = normalizeRole(user.role);

    const managedByMainMerchant =
      isMainMerchantRole(actorRole) &&
      user.mainMerchantId?.toString?.() === auth.user._id.toString() &&
      (isSubmerchantRole(targetRole) || targetRole === 'marketer');

    if (isMainMerchantRole(actorRole) && !managedByMainMerchant) {
      return NextResponse.json({ error: 'You can only manage your own submerchants and marketers' }, { status: 403 });
    }

    if (user.isProtected && actorRole !== 'owner') {
      return NextResponse.json({ error: 'Protected owner cannot be modified by this user' }, { status: 403 });
    }

    if (user.isProtected && body.role && body.role !== 'owner') {
      return NextResponse.json({ error: 'Protected owner role cannot be changed' }, { status: 400 });
    }

    if (user.isProtected && body.active === false) {
      return NextResponse.json({ error: 'Protected owner cannot be deactivated' }, { status: 400 });
    }

    const update: any = {};

    if (body.name !== undefined) {
      const nextName = safeTrim(body.name, 120);
      if (!nextName) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      update.name = nextName;
    }
    if (body.active !== undefined) update.active = Boolean(body.active);
    if (body.role !== undefined) {
      const normalizedNextRole = normalizeRole(String(body.role));
      if (!['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'marketer'].includes(normalizedNextRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      if (
        isMainMerchantRole(actorRole) &&
        !['submerchant', 'marketer'].includes(normalizedNextRole)
      ) {
        return NextResponse.json({ error: 'Main merchants can only assign submerchant/marketer roles' }, { status: 403 });
      }
      update.role = normalizedNextRole;
    }

    if (body.password) {
      if (String(body.password).length < 6 || String(body.password).length > 128) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      update.password = await bcryptjs.hash(String(body.password), 10);
    }

    if (body.mainMerchantId !== undefined && !isMainMerchantRole(actorRole)) {
      const requestedMainMerchantId = String(body.mainMerchantId || '').trim();
      if (requestedMainMerchantId) {
        if (!isValidObjectId(requestedMainMerchantId)) {
          return NextResponse.json({ error: 'Selected main merchant is invalid' }, { status: 400 });
        }
        const mainMerchant = await User.findById(requestedMainMerchantId).select('role');
        if (!mainMerchant || normalizeRole(mainMerchant.role) !== 'main_merchant') {
          return NextResponse.json({ error: 'Selected main merchant is invalid' }, { status: 400 });
        }
        update.mainMerchantId = requestedMainMerchantId;
      } else {
        update.mainMerchantId = null;
      }
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
    if (updated && isSubmerchantRole(normalizeRole(updated.role))) {
      await syncMarketplaceProductSnapshotForMerchant(updated._id.toString());
    }
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
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin', 'main_merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const actorRole = normalizeRole(auth.user.role);

    if (auth.user._id.toString() === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const deleteQuery: Record<string, any> = {
      _id: id,
      isProtected: { $ne: true },
    };

    if (isMainMerchantRole(actorRole)) {
      deleteQuery.mainMerchantId = auth.user._id;
      deleteQuery.role = { $in: ['submerchant', 'merchant', 'marketer'] };
    }

    // Fast path: in the common valid case we delete in a single query.
    const deletedUser: any = await User.findOneAndDelete(deleteQuery).select('_id').lean();
    if (deletedUser) {
      return NextResponse.json({ success: true });
    }

    // Fallback path: classify error for user-friendly messages.
    const user: any = await User.findById(id).select('_id role mainMerchantId isProtected').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const targetRole = normalizeRole(String(user.role || ''));

    if (user.isProtected) {
      return NextResponse.json({ error: 'Protected owner cannot be deleted' }, { status: 403 });
    }

    if (isMainMerchantRole(actorRole)) {
      const canDelete =
        user.mainMerchantId?.toString?.() === auth.user._id.toString() &&
        (isSubmerchantRole(targetRole) || targetRole === 'marketer');
      if (!canDelete) {
        return NextResponse.json({ error: 'You can only delete your own submerchants and marketers' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  } catch (error: any) {
    console.error('[v0] User delete API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
