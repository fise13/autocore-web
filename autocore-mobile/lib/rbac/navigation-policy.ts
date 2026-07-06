import {
  canAccessMissionControl,
  canAccessMyEarnings,
  canManageEmployees,
  canManageSettings,
  canViewEmployees,
  getDataScope,
  isMobileTabAllowed,
  type MobileTabId,
} from '@autocore/rbac';
import type { UserEntity } from '@/types/user';
import type { NavItemId } from '@/features/settings/types';

const NAV_TO_TAB: Partial<Record<NavItemId, MobileTabId>> = {
  mission: 'index',
  search: 'search',
  scan: 'scan',
  orders: 'orders',
  accounting: 'accounting',
  profile: 'profile',
};

export function isMobileNavItemAllowed(
  user: UserEntity | null | undefined,
  navId: NavItemId,
): boolean {
  if (!user || user.isActive === false) return false;

  const tab = NAV_TO_TAB[navId];
  if (tab) return isMobileTabAllowed(user, tab);

  if (navId === 'warehouse' || navId === 'inventory' || navId === 'sales') {
    return getDataScope(user, 'inventory') !== 'none';
  }

  if (navId === 'settings') {
    return canManageSettings(user);
  }

  return true;
}

export {
  canAccessMissionControl,
  canAccessMyEarnings,
  canManageEmployees,
  canManageSettings,
  canViewEmployees,
  isMobileTabAllowed,
};
