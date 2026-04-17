import { normalizePhoneNumber } from '@/lib/phone';
import type { UserRole } from '@/types';

export const PRIMARY_ADMIN_PHONE = '0708355692';

type AdminIdentity = {
  role?: UserRole | null;
  phone?: string | null;
};

export function isPrimaryAdminPhone(phone: string | null | undefined): boolean {
  return normalizePhoneNumber(phone ?? '') === PRIMARY_ADMIN_PHONE;
}

export function hasPrimaryAdminAccess(identity: AdminIdentity | null | undefined): boolean {
  return identity?.role === 'admin' && isPrimaryAdminPhone(identity.phone);
}
