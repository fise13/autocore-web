/** Query keys warmed during session bootstrap (must match each realtime hook). */
export function sessionBootstrapQueryKeys(
  companyId: string,
  uid: string | null,
): readonly (readonly unknown[])[] {
  return [
    ['realtime', 'company-app-config', companyId],
    ['realtime', 'work-orders', companyId],
    ['realtime', 'inventory-items', companyId],
    ['realtime', 'financial-operations', companyId],
    ['realtime', 'payroll-transactions', companyId],
    ['realtime', 'clients', companyId],
    ['realtime', 'vehicles', companyId],
    ['realtime', 'motors', companyId, uid],
    ['realtime', 'employees', companyId],
  ] as const;
}

/**
 * Minimal keys that must be ready before the shell is interactive.
 * Heavy catalogs (motors/ops/inventory) may still stream in after reveal.
 */
export function sessionInteractiveQueryKeys(
  companyId: string,
): readonly (readonly unknown[])[] {
  return [
    ['realtime', 'company-app-config', companyId],
    ['realtime', 'work-orders', companyId],
    ['realtime', 'clients', companyId],
    ['realtime', 'employees', companyId],
  ] as const;
}
