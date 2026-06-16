"use client";

import { useMemo } from "react";

import { McDashboardActivity } from "@/components/mission-control/dashboard/mc-dashboard-activity";
import { McDashboardStats } from "@/components/mission-control/dashboard/mc-dashboard-stats";
import { McOperationsChart } from "@/components/mission-control/dashboard/mc-operations-chart";
import { McRecentOperations } from "@/components/mission-control/dashboard/mc-recent-operations";
import { McRevenueChart } from "@/components/mission-control/dashboard/mc-revenue-chart";
import { McTeamOnDuty } from "@/components/mission-control/dashboard/mc-team-on-duty";
import { McWarehouseHealth } from "@/components/mission-control/dashboard/mc-warehouse-health";
import { McWorkOrdersChart } from "@/components/mission-control/dashboard/mc-work-orders-chart";
import { QuickActionsPanel } from "@/components/mission-control/quick-actions/quick-actions-panel";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { buildDashboardStats } from "@/lib/mission-control/compute-dashboard-charts";

type McDashboardGridProps = ReturnType<typeof useMissionControlData>;

export function McDashboardGrid(props: McDashboardGridProps) {
  const {
    overview,
    operations,
    warehouseItems,
    workOrders,
    employees,
    activityLogs,
    activityError,
    isLoading,
    permissions,
  } = props;

  const stats = useMemo(
    () =>
      buildDashboardStats({
        metrics: overview,
        operations: permissions.canAccounting ? operations : [],
        permissions,
      }),
    [operations, overview, permissions],
  );

  const motorAvailable = overview.activeInventoryCount;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <McDashboardStats stats={stats} isLoading={isLoading} />

      {permissions.canAccounting ? <McRevenueChart operations={operations} isLoading={isLoading} /> : null}

      {permissions.canWarehouse || permissions.canMotors ? (
        <McWarehouseHealth
          warehouseItems={warehouseItems}
          motorLowStock={overview.lowStockCount}
          motorAvailable={motorAvailable}
          isLoading={isLoading}
          canWarehouse={permissions.canWarehouse}
          canMotors={permissions.canMotors}
        />
      ) : null}

      {permissions.canAccounting ? (
        <McOperationsChart operations={operations} isLoading={isLoading} />
      ) : null}

      {permissions.canWorkOrders ? (
        <McWorkOrdersChart workOrders={workOrders} isLoading={isLoading} />
      ) : null}

      {permissions.canEmployees ? (
        <McTeamOnDuty employees={employees} workOrders={workOrders} isLoading={isLoading} />
      ) : null}

      {permissions.canAccounting ? (
        <McRecentOperations operations={operations} isLoading={isLoading} />
      ) : null}

      {permissions.canEmployees ? (
        <McDashboardActivity
          entries={activityLogs}
          isLoading={isLoading}
          error={activityError}
        />
      ) : (
        <QuickActionsPanel variant="dashboard" />
      )}
    </div>
  );
}
