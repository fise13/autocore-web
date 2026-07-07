import { hasPermission, type Permission, type UserEntity, type UserRole } from './user';
import { getDataScope } from './data-scopes';

export type MobileTabId =
  | 'index'
  | 'search'
  | 'scan'
  | 'orders'
  | 'accounting'
  | 'profile'
  | 'my-earnings';

export type WebNavItemId =
  | 'home'
  | 'motors'
  | 'sold'
  | 'warehouse'
  | 'work_orders'
  | 'my_earnings'
  | 'accounting';

const ROLE_NAV_ALLOWLIST: Partial<Record<UserRole, readonly WebNavItemId[]>> = {
  mechanic: ['home', 'work_orders', 'my_earnings'],
  diagnostician: ['home', 'work_orders'],
  accountant: ['accounting'],
  admin: ['home', 'work_orders', 'warehouse'],
};

const MOBILE_TAB_PERMISSION: Partial<Record<MobileTabId, Permission>> = {
  index: 'analytics_view',
  search: 'inventory_view',
  scan: 'inventory_view',
  orders: 'work_orders_view',
  accounting: 'accounting_view',
};

function roleNavAllowlist(role: UserRole | undefined): readonly WebNavItemId[] | null {
  if (!role) return null;
  return ROLE_NAV_ALLOWLIST[role] ?? null;
}

export function canAccessMyEarnings(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return hasPermission(user, 'payroll_view_own');
}

export function isEmployeeMissionControlUser(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return getDataScope(user, 'work_orders') === 'assigned_work_orders';
}

export function canAccessMissionControl(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  const allowlist = roleNavAllowlist(user.role);
  if (allowlist) return allowlist.includes('home');
  return (
    hasPermission(user, 'accounting_view') ||
    hasPermission(user, 'inventory_view') ||
    hasPermission(user, 'work_orders_view') ||
    hasPermission(user, 'employee_view')
  );
}

export function isWebNavAllowed(
  user: UserEntity | null | undefined,
  navId: WebNavItemId,
): boolean {
  if (!user) return false;

  const allowlist = roleNavAllowlist(user.role);
  if (allowlist && !allowlist.includes(navId)) return false;

  if (navId === 'home') return canAccessMissionControl(user);
  if (navId === 'my_earnings') return canAccessMyEarnings(user);
  if (navId === 'work_orders') return hasPermission(user, 'work_orders_view');
  if (navId === 'accounting') return hasPermission(user, 'accounting_view');
  if (navId === 'warehouse' || navId === 'motors' || navId === 'sold') {
    return hasPermission(user, 'inventory_view');
  }
  return true;
}

export function isMobileTabAllowed(
  user: UserEntity | null | undefined,
  tabId: MobileTabId,
): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;

  if (tabId === 'profile') return true;

  if (tabId === 'my-earnings') return canAccessMyEarnings(user);

  if (tabId === 'index') return canAccessMissionControl(user);

  const permission = MOBILE_TAB_PERMISSION[tabId];
  if (!permission) return true;
  if (!hasPermission(user, permission)) return false;

  if (tabId === 'orders') {
    return getDataScope(user, 'work_orders') !== 'none';
  }
  if (tabId === 'accounting') {
    return getDataScope(user, 'accounting') !== 'none';
  }
  if (tabId === 'search' || tabId === 'scan') {
    return getDataScope(user, 'inventory') !== 'none';
  }

  return true;
}

export function canManageEmployees(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return hasPermission(user, 'employee_manage');
}

export function canViewEmployees(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return hasPermission(user, 'employee_view') || hasPermission(user, 'employee_manage');
}

export function canManageSettings(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return hasPermission(user, 'settings_manage');
}

export function defaultMobileTab(user: UserEntity | null | undefined): MobileTabId {
  if (!user) return 'profile';
  if (canAccessMissionControl(user)) return 'index';
  if (hasPermission(user, 'work_orders_view')) return 'orders';
  if (canAccessMyEarnings(user)) return 'my-earnings';
  if (hasPermission(user, 'accounting_view')) return 'accounting';
  if (hasPermission(user, 'inventory_view')) return 'search';
  return 'profile';
}
