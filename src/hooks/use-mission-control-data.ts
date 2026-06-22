"use client";

import { useMemo } from "react";

import { UserEntity } from "@/domain/user";
import { useActivityLogRealtime } from "@/hooks/use-activity-log-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { canAccessMotorsArea, isNavAllowed } from "@/lib/auth/app-access";
import { can, canViewEmployees } from "@/lib/auth/permissions";
import { computeOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";
import { computeInventoryAnalytics } from "@/lib/mission-control/compute-inventory-analytics";
import { computeOperationsStats } from "@/lib/mission-control/compute-operations-stats";
import { enrichActivityLogs } from "@/lib/mission-control/enrich-activity-logs";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useInventoryMovementsRealtime } from "@/hooks/use-inventory-movements-realtime";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createInventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const motorRepository = createMotorRepository();
const inventoryItemRepository = createInventoryItemRepository();
const inventoryMovementRepository = createInventoryMovementRepository();
const financialRepository = createFinancialOperationRepository();
const workOrderRepository = createWorkOrderRepository();

type UseMissionControlDataParams = {
  profile: UserEntity | null;
  uid: string;
  companyId: string;
  isPro: boolean;
  enabled?: boolean;
};

export function useMissionControlData({
  profile,
  uid,
  companyId,
  isPro,
  enabled: enabledOverride = true,
}: UseMissionControlDataParams) {
  const canAccounting = can(profile, "accounting_view");
  const canInventory = can(profile, "inventory_view");
  const canMotors = canAccessMotorsArea(profile);
  const canWarehouse = isNavAllowed(profile, "warehouse");
  const canWorkOrders = can(profile, "work_orders_view");
  const canEmployees = isPro && canViewEmployees(profile);
  const enabled = enabledOverride && Boolean(uid && companyId);

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: enabled && canMotors,
  });

  const warehouseItemsQuery = useInventoryRealtime(
    inventoryItemRepository,
    companyId,
    enabled && canWarehouse,
  );

  const warehouseMovementsQuery = useInventoryMovementsRealtime(
    inventoryMovementRepository,
    companyId,
    undefined,
    enabled && canWarehouse,
  );

  const operationsQuery = useOperationsRealtime(financialRepository, {
    companyId,
    enabled: enabled && canAccounting,
  });

  const workOrdersQuery = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    enabled && canWorkOrders,
  );

  const { employees, isLoading: employeesLoading } = useEmployeesRealtime(
    companyId,
    enabled && canEmployees,
  );

  const { entries: activityLogs, isLoading: activityLoading, error: activityError } =
    useActivityLogRealtime(companyId, enabled && canEmployees);

  const motors = useMemo(() => motorsQuery.data ?? [], [motorsQuery.data]);
  const warehouseItems = useMemo(() => warehouseItemsQuery.data ?? [], [warehouseItemsQuery.data]);
  const warehouseMovements = warehouseMovementsQuery.movements;
  const operations = useMemo(() => operationsQuery.data ?? [], [operationsQuery.data]);
  const workOrders = workOrdersQuery.orders;

  const enrichedActivityLogs = useMemo(
    () => enrichActivityLogs(activityLogs, canEmployees ? employees : []),
    [activityLogs, canEmployees, employees],
  );

  const overview = useMemo(
    () =>
      computeOverviewMetrics({
        operations: canAccounting ? operations : [],
        motors: canMotors ? motors : [],
        warehouseItems: canWarehouse ? warehouseItems : [],
        employees: canEmployees ? employees : [],
        activityLogs: canEmployees ? enrichedActivityLogs : [],
      }),
    [canAccounting, canEmployees, canMotors, canWarehouse, employees, enrichedActivityLogs, motors, operations, warehouseItems],
  );

  const operationsStats = useMemo(
    () => computeOperationsStats(canEmployees ? enrichedActivityLogs : [], employees),
    [canEmployees, enrichedActivityLogs, employees],
  );

  const inventoryAnalytics = useMemo(
    () =>
      computeInventoryAnalytics({
        motors: canMotors ? motors : [],
        operations: canAccounting ? operations : [],
      }),
    [canAccounting, canMotors, motors, operations],
  );

  const isLoading =
    (canMotors && motorsQuery.isLoading) ||
    (canWarehouse && warehouseItemsQuery.isLoading) ||
    (canAccounting && operationsQuery.isLoading) ||
    (canWorkOrders && workOrdersQuery.isLoading) ||
    (canEmployees && (employeesLoading || activityLoading));

  const latestMotors = useMemo(() => {
    return [...motors]
      .filter((motor) => !motor.deletedAt)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? a.updatedAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? b.updatedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [motors]);

  const recentOperations = useMemo(() => {
    return [...operations]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [operations]);

  const recentlyModifiedMotors = useMemo(() => {
    return [...motors]
      .filter((motor) => !motor.deletedAt && motor.updatedAt)
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .slice(0, 5);
  }, [motors]);

  const recentWarehouseItems = useMemo(() => {
    return [...warehouseItems]
      .filter((item) => item.status === "active")
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .slice(0, 5);
  }, [warehouseItems]);

  const lowStockWarehouseItems = useMemo(() => {
    return warehouseItems
      .filter((item) => item.status === "active")
      .filter((item) => item.totalAvailable <= (item.lowStockThreshold ?? 1))
      .slice(0, 5);
  }, [warehouseItems]);

  return {
    overview,
    operationsStats,
    inventoryAnalytics,
    motors,
    warehouseItems,
    warehouseMovements,
    operations,
    workOrders,
    employees,
    activityLogs: enrichedActivityLogs,
    activityError,
    latestMotors,
    recentOperations,
    recentlyModifiedMotors,
    recentWarehouseItems,
    lowStockWarehouseItems,
    isLoading,
    permissions: {
      canAccounting,
      canInventory,
      canMotors,
      canWarehouse,
      canWorkOrders,
      canEmployees,
    },
  };
}
