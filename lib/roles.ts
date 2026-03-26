export type ExtendedAppRole =
  | 'owner'
  | 'admin'
  | 'main_merchant'
  | 'submerchant'
  | 'merchant'
  | 'marketer';

export const ADMIN_ROLES: ExtendedAppRole[] = ['owner', 'admin'];

export function isAdminRole(role?: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

export function isMainMerchantRole(role?: string | null): boolean {
  return role === 'main_merchant';
}

export function isSubmerchantRole(role?: string | null): boolean {
  return role === 'submerchant' || role === 'merchant';
}

export function isMarketerRole(role?: string | null): boolean {
  return role === 'marketer';
}

export function normalizeRole(role?: string | null): string {
  if (!role) return '';
  if (role === 'merchant') return 'submerchant';
  return role;
}
