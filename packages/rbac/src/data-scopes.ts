import { hasPermission, type Permission, type UserEntity, type UserRole } from './user';

export type DataScope = 'company' | 'assigned_work_orders' | 'own_payroll' | 'none';

export type DataDomain =
  | 'work_orders'
  | 'accounting'
  | 'payroll'
  | 'inventory'
  | 'clients'
  | 'vehicles'
  | 'employees'
  | 'motors'
  | 'analytics';

const ASSIGNED_WORK_ORDER_ROLES = new Set<UserRole>(['mechanic', 'diagnostician']);

const DOMAIN_PERMISSION: Record<DataDomain, Permission | null> = {
  work_orders: 'work_orders_view',
  accounting: 'accounting_view',
  payroll: 'accounting_view',
  inventory: 'inventory_view',
  clients: 'clients_manage',
  vehicles: 'vehicles_manage',
  employees: 'employee_view',
  motors: 'inventory_view',
  analytics: 'analytics_view',
};

export function getDataScope(user: UserEntity | null | undefined, domain: DataDomain): DataScope {
  if (!user) return 'none';
  if (user.isActive === false) return 'none';

  const permission = DOMAIN_PERMISSION[domain];
  if (permission && !hasPermission(user, permission)) {
    if (domain === 'payroll' && hasPermission(user, 'payroll_view_own')) {
      return 'own_payroll';
    }
    return 'none';
  }

  if (domain === 'work_orders' && ASSIGNED_WORK_ORDER_ROLES.has(user.role)) {
    return hasPermission(user, 'work_orders_view') ? 'assigned_work_orders' : 'none';
  }

  if (domain === 'payroll' && user.role === 'mechanic' && hasPermission(user, 'payroll_view_own')) {
    return 'own_payroll';
  }

  return 'company';
}

export function shouldSubscribeToDomain(
  user: UserEntity | null | undefined,
  domain: DataDomain,
): boolean {
  return getDataScope(user, domain) !== 'none';
}

export type AccessScopes = {
  workOrders: DataScope;
  accounting: DataScope;
  payroll: DataScope;
  inventory: DataScope;
  clients: DataScope;
  vehicles: DataScope;
  employees: DataScope;
  motors: DataScope;
  analytics: DataScope;
};

export function resolveAccessScopes(user: UserEntity | null | undefined): AccessScopes {
  return {
    workOrders: getDataScope(user, 'work_orders'),
    accounting: getDataScope(user, 'accounting'),
    payroll: getDataScope(user, 'payroll'),
    inventory: getDataScope(user, 'inventory'),
    clients: getDataScope(user, 'clients'),
    vehicles: getDataScope(user, 'vehicles'),
    employees: getDataScope(user, 'employees'),
    motors: getDataScope(user, 'motors'),
    analytics: getDataScope(user, 'analytics'),
  };
}
