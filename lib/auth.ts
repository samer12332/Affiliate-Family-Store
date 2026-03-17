import { User } from '@/lib/models';
import { verifyToken } from '@/server/utils/auth';
import { NextRequest, NextResponse } from 'next/server';

export type AppRole = 'owner' | 'super_admin' | 'merchant' | 'marketer';

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

  const user = await User.findById(decoded.id);
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

  if (!roles.includes(auth.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return auth;
}

export function canManageMerchantResource(
  actor: { role: AppRole; _id: { toString(): string } },
  merchantId: string
) {
  if (actor.role === 'owner' || actor.role === 'super_admin') {
    return true;
  }

  return actor.role === 'merchant' && actor._id.toString() === merchantId;
}

export function sanitizeUser(user: any) {
  return {
    _id: user._id?.toString?.() || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    isProtected: Boolean(user.isProtected),
    merchantProfile: user.merchantProfile || null,
    marketerProfile: user.marketerProfile || null,
    createdAt: user.createdAt,
  };
}
