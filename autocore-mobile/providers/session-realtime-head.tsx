import { useEffect, useRef, useState } from 'react';
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
import { useWarehousesRealtime } from '@/hooks/use-warehouses-realtime';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import {
  preloadSessionSnapshots,
  preloadSessionSnapshotsChunked,
} from '@/lib/realtime/preload-session-snapshots';
import { clearRealtimeSubscriptions, reconnectRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { hydrateSearchIdleCache } from '@/lib/search/search-idle-cache';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';

const KEEP = { keepAlive: true } as const;
const RECONNECT_MIN_BACKGROUND_MS = 90_000;
/**
 * Delay heavy catalog listeners so first Firestore onSnapshot map+apply storms
 * do not freeze RN presses after first paint (NativeTabs stay live; JS dies).
 */
const HEAVY_LISTENERS_DELAY_MS = 2_500;

/**
 * Headless session listener host. Renders nothing so Firestore snapshots
 * never re-render the navigation tree.
 */
export function SessionRealtimeHead() {
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const status = useAuthStore((s) => s.status);
  const rbac = useRbacPolicy();
  const [heavyEnabled, setHeavyEnabled] = useState(false);

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = firebaseUser?.uid ?? null;
  const hasAccess =
    status === 'authenticated' &&
    rbac.isActive &&
    isProductionCompanyId(profile?.companyId);
  const active = Boolean(hasAccess && isProductionCompanyId(companyId));
  const prevCompanyIdRef = useRef<string | null>(null);

  const workOrdersCompanyId = active && rbac.shouldSubscribe('workOrders') ? companyId : null;
  const inventoryCompanyId =
    active && heavyEnabled && rbac.shouldSubscribe('inventory') ? companyId : null;
  const accountingCompanyId =
    active && heavyEnabled && rbac.shouldSubscribe('accounting') ? companyId : null;
  const payrollCompanyId =
    active && heavyEnabled && rbac.shouldSubscribe('payroll') ? companyId : null;
  const clientsCompanyId = active && rbac.shouldSubscribe('clients') ? companyId : null;
  const vehiclesCompanyId =
    active && heavyEnabled && rbac.shouldSubscribe('vehicles') ? companyId : null;
  const motorsCompanyId =
    active && heavyEnabled && rbac.shouldSubscribe('motors') ? companyId : null;
  const employeesCompanyId = active && rbac.shouldSubscribe('employees') ? companyId : null;

  usePresenceHeartbeat(companyId, uid, active);

  useEffect(() => {
    if (!active) {
      setHeavyEnabled(false);
      return;
    }
    const heavyTimer = setTimeout(() => {
      setHeavyEnabled(true);
    }, HEAVY_LISTENERS_DELAY_MS);
    return () => {
      clearTimeout(heavyTimer);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !companyId) return;
    preloadSessionSnapshots(companyId, uid);
    preloadSessionSnapshotsChunked(companyId, uid);
    setTimeout(() => {
      hydrateSearchIdleCache();
    }, 0);
  }, [active, companyId, uid]);

  useEffect(() => {
    const prev = prevCompanyIdRef.current;
    const next = companyId || null;
    // Only wipe when switching between two real companies. A brief null flicker
    // during hydration must not clear MMKV snapshots / RQ catalogs (Overview
    // charts and Finance would go empty until the next full snapshot storm).
    if (prev && next && prev !== next) {
      clearRealtimeSubscriptions();
    }
    prevCompanyIdRef.current = next;
  }, [companyId]);

  useEffect(() => {
    if (!active) return;

    let backgroundedAt: number | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt = Date.now();
        return;
      }

      if (state !== 'active') return;

      const awayMs = backgroundedAt ? Date.now() - backgroundedAt : 0;
      backgroundedAt = null;

      if (awayMs < RECONNECT_MIN_BACKGROUND_MS) return;

      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        reconnectRealtimeSubscriptions();
      }, 400);
    });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      subscription.remove();
    };
  }, [active]);

  // Light — needed for shell chrome / WO list. Start immediately.
  useCompanyAppConfig(active ? companyId : null, KEEP);
  useWorkOrdersRealtime(workOrdersCompanyId, {
    ...KEEP,
    scope: rbac.scopes.workOrders,
    uid,
  });
  useClientsRealtime(clientsCompanyId, KEEP);
  useEmployeesRealtime(employeesCompanyId, Boolean(employeesCompanyId), KEEP);

  // Heavy catalogs — delayed so onSnapshot map storms do not eat the first taps.
  useInventoryCatalog(inventoryCompanyId, KEEP);
  useOperationsRealtime(accountingCompanyId, KEEP);
  usePayrollTransactionsRealtime(payrollCompanyId, {
    ...KEEP,
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });
  useVehiclesRealtime(vehiclesCompanyId, KEEP);
  useMotorsRealtime(motorsCompanyId, uid, Boolean(motorsCompanyId), KEEP);
  useWarehousesRealtime(inventoryCompanyId, KEEP);

  return null;
}
