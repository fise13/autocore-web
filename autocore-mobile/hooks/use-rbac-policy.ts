import { useCallback, useMemo } from 'react';

import {
  canAccessMissionControl,
  canAccessMyEarnings,
  canManageEmployees,
  canManageSettings,
  canViewEmployees,
  defaultMobileTab,
  hasPermission,
  resolveAccessScopes,
  type AccessScopes,
  type DataScope,
  type Permission,
} from '@autocore/rbac';
import { useSession } from '@/hooks/use-session';
import type { UserEntity } from '@/types/user';

export type RbacPolicy = {
  profile: UserEntity | null;
  uid: string | null;
  companyId: string;
  isOwner: boolean;
  isActive: boolean;
  scopes: AccessScopes;
  can: (permission: Permission) => boolean;
  scopeFor: (domain: keyof AccessScopes) => DataScope;
  nav: {
    canAccessMissionControl: boolean;
    canAccessMyEarnings: boolean;
    canManageSettings: boolean;
    canManageEmployees: boolean;
    canViewEmployees: boolean;
    defaultTab: ReturnType<typeof defaultMobileTab>;
  };
  shouldSubscribe: (domain: keyof AccessScopes) => boolean;
};

export function useRbacPolicy(): RbacPolicy {
  const { profile, uid, companyId, can } = useSession();

  const scopes = useMemo(() => resolveAccessScopes(profile), [profile]);
  const isOwner = Boolean(profile?.isCompanyOwner);
  const isActive = profile?.isActive !== false;

  const scopeFor = useCallback(
    (domain: keyof AccessScopes): DataScope => scopes[domain],
    [scopes],
  );

  const shouldSubscribe = useCallback(
    (domain: keyof AccessScopes) => isActive && scopes[domain] !== 'none',
    [isActive, scopes],
  );

  const nav = useMemo(
    () => ({
      canAccessMissionControl: canAccessMissionControl(profile),
      canAccessMyEarnings: canAccessMyEarnings(profile),
      canManageSettings: canManageSettings(profile),
      canManageEmployees: canManageEmployees(profile),
      canViewEmployees: canViewEmployees(profile),
      defaultTab: defaultMobileTab(profile),
    }),
    [profile],
  );

  return useMemo(
    () => ({
      profile,
      uid,
      companyId,
      isOwner,
      isActive,
      scopes,
      can,
      scopeFor,
      nav,
      shouldSubscribe,
    }),
    [profile, uid, companyId, isOwner, isActive, scopes, can, scopeFor, nav, shouldSubscribe],
  );
}

export function useCan(permission: Permission): boolean {
  const { can } = useRbacPolicy();
  return can(permission);
}
