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

import { filterWorkOrdersByScope, isAssignedToWorkOrder, isClaimableWorkOrder } from '@autocore/rbac';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useMobileWarehouseLocations } from '@/hooks/use-mobile-relocate';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { isIncomingJobState, isIncomingMotor } from '@/features/engines/lib/engine-lane';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { WarehouseEntity } from '@/types/warehouse';
import type { WorkOrder } from '@/types/work-order';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import { EMPTY_WORK_COUNTS, isAwaitingPlacement, type WorkCounts } from '../lib/work-model';
import { buildWorkspaceSeries, type WorkspaceSeriesMap } from '../lib/workspace-series';

export type WorkCountsResult = {
  counts: WorkCounts;
  /** Scoped work orders — feeds Work → Today Health trend. */
  orders: WorkOrder[];
  /** Normalized inventory — unplaced + low-stock trend. */
  items: InventoryItem[];
  /** Intake jobs in the bay. */
  intakeJobs: Array<{ state: string; createdAt?: unknown; updatedAt?: unknown }>;
  /** Pending payroll + claimable jobs. */
  earningsAttention: number;
  /** Eight-week shape per Work node — feeds the trailing spark on each row. */
  series: WorkspaceSeriesMap;
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
  const wantsEarnings = nodeIds.has('earnings');
  const wantsEngines = nodeIds.has('engines');
  const wantsInventory = nodeIds.has('parts') || nodeIds.has('receiving');
  const wantsLocations = nodeIds.has('locations');
  const wantsIntakeJobs = wantsEngines;

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
  const payrollKey = useMemo(
    () => ['realtime', 'payroll-transactions', companyId, rbac.scopes.payroll, uid] as const,
    [companyId, rbac.scopes.payroll, uid],
  );

  const ordersEnabled =
    hasCompany && (wantsOrders || wantsEarnings) && rbac.scopes.workOrders !== 'none';
  const payrollEnabled = hasCompany && wantsEarnings && rbac.scopes.payroll !== 'none';
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
  const rawPayroll = useSessionQueryData<PayrollTransaction[]>(payrollKey, payrollEnabled, []);

  const defaultWarehouseId = useMemo(() => {
    const list = Array.isArray(warehouses) ? warehouses : [];
    const preferred = list.find((warehouse) => warehouse.isDefault) ?? list[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const locationsQuery = useMobileWarehouseLocations(
    defaultWarehouseId,
    warehousesEnabled && Boolean(defaultWarehouseId),
  );

  const intake = useEngineIntakeJobs(wantsIntakeJobs && hasCompany ? companyId : null);

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
  const intakeReady = !wantsIntakeJobs || !hasCompany || !intake.loading;
  const enginesReady = (!motorsEnabled || motorsReady) && intakeReady;
  const payrollReady = !payrollEnabled || isRealtimeReady(payrollKey);

  const scopedOrders = useMemo(() => {
    if (!ordersEnabled || !ordersReady) return [];
    const list = Array.isArray(rawOrders) ? rawOrders : [];
    if (rbac.scopes.workOrders !== 'assigned_work_orders' || !uid) return list;
    return filterWorkOrdersByScope(list, uid, rbac.scopes.workOrders);
  }, [ordersEnabled, ordersReady, rawOrders, rbac.scopes.workOrders, uid]);

  const ownPayroll = useMemo(() => {
    if (!payrollEnabled || !payrollReady || !uid) return [];
    const list = Array.isArray(rawPayroll) ? rawPayroll : [];
    return list.filter((row) => row.employeeId === uid);
  }, [payrollEnabled, payrollReady, rawPayroll, uid]);

  const items = useMemo(() => {
    if (!inventoryEnabled || !inventoryReady) return [];
    const list = Array.isArray(rawInventory) ? rawInventory : [];
    return list.map((item) => normalizeInventoryItem(item));
  }, [inventoryEnabled, inventoryReady, rawInventory]);

  const locationsData = locationsQuery.data;
  // Memoized because both feed downstream `useMemo`s: a fresh `[]` on every
  // render would rebuild the counts and the eight-week series each time.
  const intakeJobs = useMemo(
    () => (Array.isArray(intake.jobs) ? intake.jobs : []),
    [intake.jobs],
  );
  const motorsList = useMemo(() => (Array.isArray(motors) ? motors : []), [motors]);

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

    if (wantsEngines && enginesReady) {
      const incomingJobs = intakeJobs.filter((job) => isIncomingJobState(job.state));
      const incomingJobIds = new Set(incomingJobs.map((job) => job.id));
      const incomingEngineIds = new Set(
        incomingJobs.map((job) => job.engineId).filter((id): id is string => Boolean(id)),
      );
      const extraIncoming = motorsEnabled
        ? motorsList.filter((motor) => {
            if (!isIncomingMotor(motor)) return false;
            if (motor.intakeJobId && incomingJobIds.has(motor.intakeJobId)) return false;
            if (incomingEngineIds.has(motor.id)) return false;
            return true;
          }).length
        : 0;
      const yard = motorsEnabled
        ? motorsList.filter(
            (motor) => !isIncomingMotor(motor) && !incomingEngineIds.has(motor.id),
          )
        : [];
      next.engines = {
        total: yard.length,
        incoming: incomingJobs.length + extraIncoming,
        awaiting: intakeJobs.filter((job) => job.state === 'open' || job.state === 'rework')
          .length,
      };
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

    if (wantsEarnings && ordersReady && payrollReady && uid) {
      next.earnings = {
        pendingCount: ownPayroll.filter((row) => row.status === 'pending').length,
        claimable: scopedOrders.filter((order) => isClaimableWorkOrder(order)).length,
        myOpen: scopedOrders.filter(
          (order) => isAssignedToWorkOrder(order, uid) && isOpenStatus(order.status),
        ).length,
        payoutTotal: ownPayroll.length,
      };
    }

    return next;
  }, [
    enginesReady,
    hasCompany,
    intakeJobs,
    intakeReady,
    inventoryEnabled,
    inventoryReady,
    items,
    locationsData,
    locationsReady,
    motorsEnabled,
    motorsList,
    motorsReady,
    nodeIds,
    ordersEnabled,
    ordersReady,
    scopedOrders,
    warehousesEnabled,
    wantsEarnings,
    wantsEngines,
    payrollReady,
    ownPayroll,
    uid,
  ]);

  /**
   * `null` per source, not `[]` — a listener that has not answered yet is
   * unknown, and an unknown queue must draw no chart rather than a flat zero.
   */
  const series = useMemo<WorkspaceSeriesMap>(
    () =>
      buildWorkspaceSeries({
        orders: ordersEnabled && ordersReady ? scopedOrders : null,
        items: inventoryEnabled && inventoryReady ? items : null,
        motors: motorsEnabled && motorsReady ? motorsList : null,
        intakeJobs: wantsIntakeJobs && hasCompany && intakeReady ? intakeJobs : null,
        payroll: payrollEnabled && payrollReady ? ownPayroll : null,
      }),
    [
      hasCompany,
      intakeJobs,
      intakeReady,
      inventoryEnabled,
      inventoryReady,
      items,
      motorsEnabled,
      motorsList,
      motorsReady,
      ordersEnabled,
      ordersReady,
      ownPayroll,
      payrollEnabled,
      payrollReady,
      scopedOrders,
      wantsIntakeJobs,
    ],
  );

  const ready =
    hasCompany &&
    ordersReady &&
    inventoryReady &&
    motorsReady &&
    locationsReady &&
    intakeReady;

  const earningsAttention =
    (counts.earnings?.pendingCount ?? 0) + (counts.earnings?.claimable ?? 0);

  return {
    counts,
    orders: scopedOrders,
    items,
    intakeJobs,
    earningsAttention,
    series,
    ready,
  };
}
