import { normalizePhoneNumber } from '@/lib/phone';
import { ADMIN_HOST } from '@/lib/urls';
import type { UserRole } from '@/types';

export const PRIMARY_ADMIN_PHONE = '0708355692';

type AdminIdentity = {
  role?: UserRole | null;
  phone?: string | null;
};

function normalizeHost(value: string | null | undefined): string {
  return (value ?? '')
    .split(':')[0]
    .trim()
    .toLowerCase();
}

export function isPrimaryAdminPhone(phone: string | null | undefined): boolean {
  return normalizePhoneNumber(phone ?? '') === PRIMARY_ADMIN_PHONE;
}

export function hasPrimaryAdminAccess(identity: AdminIdentity | null | undefined): boolean {
  return identity?.role === 'admin' && isPrimaryAdminPhone(identity.phone);
}

export function isPrimaryAdminHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === ADMIN_HOST;
}

export function getScopedRoleForHost(
  identity: AdminIdentity | null | undefined,
  host: string | null | undefined
): UserRole {
  return hasPrimaryAdminAccess(identity) && isPrimaryAdminHost(host) ? 'admin' : 'user';
}
