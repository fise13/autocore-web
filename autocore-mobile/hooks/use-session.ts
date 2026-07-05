import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@/store/auth-store';
import { normalizeCompanyId } from '@/lib/company-id';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { can } from '@/lib/permissions';
import type { Permission } from '@/types/user';

export function useSession() {
  const profile = useAuthStore((s) => s.profile);
  const companyConfig = useAuthStore((s) => s.companyConfig);
  const memberships = useAuthStore((s) => s.memberships);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const companyId = resolveSessionCompanyId(profile, memberships) ?? normalizeCompanyId(profile?.companyId);
  const uid = firebaseUser?.uid ?? null;

  const canPermission = useCallback(
    (permission: Permission) => can(profile, permission),
    [profile],
  );

  return useMemo(
    () => ({
      uid,
      profile,
      companyId,
      companyConfig,
      memberships,
      can: canPermission,
    }),
    [uid, profile, companyId, companyConfig, memberships, canPermission],
  );
}
