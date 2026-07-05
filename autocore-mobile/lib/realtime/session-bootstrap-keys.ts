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
