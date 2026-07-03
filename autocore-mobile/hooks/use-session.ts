import { useAuth } from '@/authentication/auth-provider';
import { normalizeCompanyId } from '@/lib/company-id';
import { can } from '@/lib/permissions';
import type { Permission } from '@/types/user';

export function useSession() {
  const { profile, companyConfig, memberships, firebaseUser } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = firebaseUser?.uid ?? null;

  return {
    uid,
    profile,
    companyId,
    companyConfig,
    memberships,
    can: (permission: Permission) => can(profile, permission),
  };
}
