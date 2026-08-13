/**
 * Live counts behind the Work rows.
 *
 * Every catalog here is already subscribed by `SessionRealtimeHead`, so this
 * hook reads the React Query cache instead of opening a second listener. A
 * count stays `null` until its listener has delivered a first snapshot — the
 * Work model treats `null` as "unknown" and keeps the catalog description,
 * which is what stops the screen from claiming "0 open orders" on cold start.
 */
import { useMemo } from 'react';

import { filterWorkOrdersByScope } from '@autocore/rbac';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useMobileWarehouseLocations } from '@/hooks/use-mobile-relocate';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';
import type { WorkOrder } from '@/types/work-order';

import { EMPTY_WORK_COUNTS, isAwaitingPlacement, type WorkCounts } from '../lib/work-model';

export type WorkCountsResult = {
  counts: WorkCounts;
  /** Session + every requested listener/query has settled (including empty). */
  ready: boolean;
};

/**
 * @param nodeIds Work node ids currently visible for this company + role.
 *   Counts are only computed — and network-backed counts only fetched — for
 *   rows the user can actually see.
 */
export function useWorkCounts(nodeIds: ReadonlySet<string>): WorkCountsResult {
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();

  const hasCompany = Boolean(companyId);
  const wantsOrders = nodeIds.has('orders');
  const wantsEngines = nodeIds.has('engines');
  const wantsInventory = nodeIds.has('parts') || nodeIds.has('receiving');
  const wantsLocations = nodeIds.has('locations');
  const wantsIntake = nodeIds.has('intake');

  const ordersKey = useMemo(
    () => ['realtime', 'work-orders', companyId, rbac.scopes.workOrders, uid] as const,
    [companyId, rbac.scopes.workOrders, uid],
  );
  const inventoryKey = useMemo(
    () => ['realtime', 'inventory-items', companyId] as const,
    [companyId],
  );
  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  const warehousesKey = useMemo(
    () => ['realtime', 'warehouses', companyId] as const,
    [companyId],
  );

  const ordersEnabled = hasCompany && wantsOrders && rbac.scopes.workOrders !== 'none';
  const inventoryEnabled = hasCompany && wantsInventory && rbac.scopes.inventory !== 'none';
  const motorsEnabled = hasCompany && wantsEngines && rbac.scopes.motors !== 'none';
  const warehousesEnabled = hasCompany && wantsLocations && rbac.scopes.inventory !== 'none';

  const rawOrders = useSessionQueryData<WorkOrder[]>(ordersKey, ordersEnabled, []);
  const rawInventory = useSessionQueryData<InventoryItem[]>(inventoryKey, inventoryEnabled, []);
  const motors = useSessionQueryData<MotorEntity[]>(motorsKey, motorsEnabled, []);
  const warehouses = useSessionQueryData<WarehouseEntity[]>(
    warehousesKey,
    warehousesEnabled,
    [],
  );

  const defaultWarehouseId = useMemo(() => {
    const list = Array.isArray(warehouses) ? warehouses : [];
    const preferred = list.find((warehouse) => warehouse.isDefault) ?? list[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const locationsQuery = useMobileWarehouseLocations(
    defaultWarehouseId,
    warehousesEnabled && Boolean(defaultWarehouseId),
  );

  const intake = useEngineIntakeJobs(wantsIntake && hasCompany ? companyId : null);

  const ordersReady = !ordersEnabled || isRealtimeReady(ordersKey);
  const inventoryReady = !inventoryEnabled || isRealtimeReady(inventoryKey);
  const motorsReady = !motorsEnabled || isRealtimeReady(motorsKey);
  const warehousesReady = !warehousesEnabled || isRealtimeReady(warehousesKey);
  // No default warehouse → treat locations as ready empty (do not block Work forever).
  const locationsReady =
    !warehousesEnabled ||
    (warehousesReady &&
      (!defaultWarehouseId ||
        locationsQuery.isSuccess ||
        locationsQuery.isError ||
        locationsQuery.isFetched));
  const intakeReady = !wantsIntake || !hasCompany || !intake.loading;

  const scopedOrders = useMemo(() => {
    if (!ordersEnabled || !ordersReady) return [];
    const list = Array.isArray(rawOrders) ? rawOrders : [];
    if (rbac.scopes.workOrders !== 'assigned_work_orders' || !uid) return list;
    return filterWorkOrdersByScope(list, uid, rbac.scopes.workOrders);
  }, [ordersEnabled, ordersReady, rawOrders, rbac.scopes.workOrders, uid]);

  const items = useMemo(() => {
    if (!inventoryEnabled || !inventoryReady) return [];
    const list = Array.isArray(rawInventory) ? rawInventory : [];
    return list.map((item) => normalizeInventoryItem(item));
  }, [inventoryEnabled, inventoryReady, rawInventory]);

  const locationsData = locationsQuery.data;
  const intakeJobs = Array.isArray(intake.jobs) ? intake.jobs : [];
  const motorsList = Array.isArray(motors) ? motors : [];

  const counts = useMemo<WorkCounts>(() => {
    const next: WorkCounts = { ...EMPTY_WORK_COUNTS };

    if (ordersEnabled && ordersReady) {
      const open = scopedOrders.filter((order) => isOpenStatus(order.status));
      next.orders = {
        total: scopedOrders.length,
        open: open.length,
        attention: open.filter((order) => order.status === 'waiting_parts').length,
      };
    }

    if (motorsEnabled && motorsReady) {
      next.engines = { total: motorsList.length };
    }

    if (inventoryEnabled && inventoryReady) {
      const active = items.filter((item) => item.status === 'active');
      if (nodeIds.has('parts')) {
        next.parts = {
          total: active.length,
          lowStock: active.filter(isWarehouseLowStock).length,
        };
      }
      if (nodeIds.has('receiving')) {
        const inStock = active.filter((item) => item.totalOnHand > 0);
        next.receiving = {
          total: inStock.length,
          awaitingPlacement: inStock.filter(isAwaitingPlacement).length,
        };
      }
    }

    if (warehousesEnabled && locationsReady) {
      const list = Array.isArray(locationsData) ? locationsData : [];
      const usable = list.filter((location) => !location.isSystem);
      next.locations = {
        locations: usable.filter((location) => location.type !== 'bin').length,
        bins: usable.filter((location) => location.type === 'bin').length,
      };
    }

    if (wantsIntake && hasCompany && intakeReady) {
      next.intake = {
        total: intakeJobs.length,
        awaiting: intakeJobs.filter((job) => job.state === 'open' || job.state === 'rework').length,
        inProgress: intakeJobs.filter(
          (job) => job.state === 'in_session' || job.state === 'paused',
        ).length,
        awaitingVerification: intakeJobs.filter((job) => job.state === 'awaiting_verification')
          .length,
      };
    }

    return next;
  }, [
    hasCompany,
    intakeJobs,
    intakeReady,
    inventoryEnabled,
    inventoryReady,
    items,
    locationsData,
    locationsReady,
    motorsEnabled,
    motorsList.length,
    motorsReady,
    nodeIds,
    ordersEnabled,
    ordersReady,
    scopedOrders,
    warehousesEnabled,
    wantsIntake,
  ]);

  const ready =
    hasCompany &&
    ordersReady &&
    inventoryReady &&
    motorsReady &&
    locationsReady &&
    intakeReady;

  return { counts, ready };
}
