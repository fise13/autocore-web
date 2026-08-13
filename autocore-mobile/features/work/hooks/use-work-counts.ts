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

/**
 * @param nodeIds Work node ids currently visible for this company + role.
 *   Counts are only computed — and network-backed counts only fetched — for
 *   rows the user can actually see.
 */
export function useWorkCounts(nodeIds: ReadonlySet<string>): WorkCounts {
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
    const preferred = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const locationsQuery = useMobileWarehouseLocations(
    defaultWarehouseId,
    warehousesEnabled && Boolean(defaultWarehouseId),
  );

  const intake = useEngineIntakeJobs(wantsIntake && hasCompany ? companyId : null);

  const ordersReady = ordersEnabled && isRealtimeReady(ordersKey);
  const inventoryReady = inventoryEnabled && isRealtimeReady(inventoryKey);
  const motorsReady = motorsEnabled && isRealtimeReady(motorsKey);

  const scopedOrders = useMemo(() => {
    if (!ordersReady) return [];
    if (rbac.scopes.workOrders !== 'assigned_work_orders' || !uid) return rawOrders;
    return filterWorkOrdersByScope(rawOrders, uid, rbac.scopes.workOrders);
  }, [ordersReady, rawOrders, rbac.scopes.workOrders, uid]);

  const items = useMemo(
    () => (inventoryReady ? rawInventory.map(normalizeInventoryItem) : []),
    [inventoryReady, rawInventory],
  );

  const locationsData = locationsQuery.data;
  const intakeJobs = intake.jobs;
  const intakeReady = wantsIntake && hasCompany && !intake.loading;

  return useMemo<WorkCounts>(() => {
    const counts: WorkCounts = { ...EMPTY_WORK_COUNTS };

    if (ordersReady) {
      const open = scopedOrders.filter((order) => isOpenStatus(order.status));
      counts.orders = {
        total: scopedOrders.length,
        open: open.length,
        attention: open.filter((order) => order.status === 'waiting_parts').length,
      };
    }

    if (motorsReady) {
      counts.engines = { total: motors.length };
    }

    if (inventoryReady) {
      const active = items.filter((item) => item.status === 'active');
      if (nodeIds.has('parts')) {
        counts.parts = {
          total: active.length,
          lowStock: active.filter(isWarehouseLowStock).length,
        };
      }
      if (nodeIds.has('receiving')) {
        const inStock = active.filter((item) => item.totalOnHand > 0);
        counts.receiving = {
          total: inStock.length,
          awaitingPlacement: inStock.filter(isAwaitingPlacement).length,
        };
      }
    }

    if (locationsData) {
      const usable = locationsData.filter((location) => !location.isSystem);
      counts.locations = {
        locations: usable.filter((location) => location.type !== 'bin').length,
        bins: usable.filter((location) => location.type === 'bin').length,
      };
    }

    if (intakeReady) {
      counts.intake = {
        total: intakeJobs.length,
        awaiting: intakeJobs.filter((job) => job.state === 'open' || job.state === 'rework').length,
        inProgress: intakeJobs.filter(
          (job) => job.state === 'in_session' || job.state === 'paused',
        ).length,
        awaitingVerification: intakeJobs.filter((job) => job.state === 'awaiting_verification')
          .length,
      };
    }

    return counts;
  }, [
    intakeJobs,
    intakeReady,
    inventoryReady,
    items,
    locationsData,
    motors.length,
    motorsReady,
    nodeIds,
    ordersReady,
    scopedOrders,
  ]);
}
