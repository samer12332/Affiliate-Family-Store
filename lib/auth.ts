import { User } from '@/lib/models';
import {
  ExtendedAppRole,
  isAdminRole,
  isMainMerchantRole,
  isMarketerRole,
  isSubmerchantRole,
  normalizeRole,
} from '@/lib/roles';
import { verifyToken } from '@/server/utils/auth';
import { NextRequest, NextResponse } from 'next/server';

export type AppRole = ExtendedAppRole;
const AUTH_USER_PROJECTION =
  '_id name email role active isProtected mainMerchantId createdByUserId merchantProfile marketerProfile createdAt';

export async function getAuthUser(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice(7);
  const decoded = verifyToken(token) as { id?: string; role?: AppRole } | null;
  if (!decoded?.id) {
    return null;
  }

  const user = await User.findById(decoded.id).select(AUTH_USER_PROJECTION);
  if (!user || !user.active) {
    return null;
  }

  return user;
}

export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true as const, user };
}

export async function requireRole(request: NextRequest, roles: AppRole[]) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth;
  }

  const actorRole = normalizeRole(auth.user.role) as AppRole;
  const acceptedRoles = new Set(roles.map((role) => normalizeRole(role) as AppRole));

  if (!acceptedRoles.has(actorRole)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return auth;
}

export async function canManageMerchantResource(
  actor: { role: AppRole; _id: { toString(): string } },
  merchantId: string
) {
  if (isAdminRole(actor.role)) {
    return true;
  }

  if (isSubmerchantRole(actor.role)) {
    return actor._id.toString() === merchantId;
  }

  if (isMainMerchantRole(actor.role)) {
    const merchant = await User.findById(merchantId).select('role mainMerchantId');
    if (!merchant || !isSubmerchantRole(merchant.role)) {
      return false;
    }
    return merchant.mainMerchantId?.toString?.() === actor._id.toString();
  }

  return false;
}

export async function getManagedSubmerchantIds(mainMerchantId: string) {
  const submerchants = await User.find({
    role: { $in: ['submerchant', 'merchant'] },
    mainMerchantId,
    active: true,
  }).select('_id');

  return submerchants.map((entry: any) => entry._id.toString());
}

export function sanitizeUser(user: any) {
  return {
    _id: user._id?.toString?.() || user._id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    active: user.active,
    isProtected: Boolean(user.isProtected),
    mainMerchantId: user.mainMerchantId?.toString?.() || null,
    createdByUserId: user.createdByUserId?.toString?.() || null,
    canSeeAllSubmerchants:
      isAdminRole(user.role) || (isMarketerRole(user.role) && !user.mainMerchantId),
    merchantProfile: user.merchantProfile || null,
    marketerProfile: user.marketerProfile || null,
    createdAt: user.createdAt,
  };
}
