import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/auth-store';
import { useClientsRealtime } from '@/hooks/use-clients-realtime';
import { useCompanyAppConfig } from '@/hooks/use-company-app-config';
import { useEmployeesRealtime } from '@/hooks/use-employees-realtime';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { useMotorsRealtime } from '@/hooks/use-motors-realtime';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useVehiclesRealtime } from '@/hooks/use-vehicles-realtime';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { preloadSessionSnapshots } from '@/lib/realtime/preload-session-snapshots';
import { clearRealtimeSubscriptions, reconnectRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { hydrateSearchIdleCache } from '@/lib/search/search-idle-cache';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';

const KEEP = { keepAlive: true } as const;

/**
 * Headless session listener host. Renders nothing so Firestore snapshots
 * never re-render the navigation tree.
 */
export function SessionRealtimeHead() {
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const status = useAuthStore((s) => s.status);
  const rbac = useRbacPolicy();

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = firebaseUser?.uid ?? null;
  const hasAccess =
    status === 'authenticated' &&
    rbac.isActive &&
    isProductionCompanyId(profile?.companyId);
  const active = Boolean(hasAccess && isProductionCompanyId(companyId));
  const prevCompanyIdRef = useRef<string | null>(null);

  const workOrdersCompanyId = active && rbac.shouldSubscribe('workOrders') ? companyId : null;
  const inventoryCompanyId = active && rbac.shouldSubscribe('inventory') ? companyId : null;
  const accountingCompanyId = active && rbac.shouldSubscribe('accounting') ? companyId : null;
  const payrollCompanyId = active && rbac.shouldSubscribe('payroll') ? companyId : null;
  const clientsCompanyId = active && rbac.shouldSubscribe('clients') ? companyId : null;
  const vehiclesCompanyId = active && rbac.shouldSubscribe('vehicles') ? companyId : null;
  const motorsCompanyId = active && rbac.shouldSubscribe('motors') ? companyId : null;
  const employeesCompanyId = active && rbac.shouldSubscribe('employees') ? companyId : null;

  usePresenceHeartbeat(companyId, uid, active);

  useEffect(() => {
    if (!active || !companyId) return;
    hydrateSearchIdleCache();
    preloadSessionSnapshots(companyId, uid);
  }, [active, companyId, uid]);

  useEffect(() => {
    const prev = prevCompanyIdRef.current;
    prevCompanyIdRef.current = companyId || null;
    if (!prev) return;
    if (!companyId || prev !== companyId) {
      clearRealtimeSubscriptions();
    }
  }, [companyId]);

  useEffect(() => {
    if (!active) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        reconnectRealtimeSubscriptions();
      }
    });

    return () => subscription.remove();
  }, [active]);

  useCompanyAppConfig(active ? companyId : null, KEEP);
  useWorkOrdersRealtime(workOrdersCompanyId, {
    ...KEEP,
    scope: rbac.scopes.workOrders,
    uid,
  });
  useInventoryCatalog(inventoryCompanyId, KEEP);
  useOperationsRealtime(accountingCompanyId, KEEP);
  usePayrollTransactionsRealtime(payrollCompanyId, {
    ...KEEP,
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });
  useClientsRealtime(clientsCompanyId, KEEP);
  useVehiclesRealtime(vehiclesCompanyId, KEEP);
  useMotorsRealtime(motorsCompanyId, uid, Boolean(motorsCompanyId), KEEP);
  useEmployeesRealtime(employeesCompanyId, Boolean(employeesCompanyId), KEEP);

  return null;
}
