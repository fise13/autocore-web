"use client";

import { useMemo } from "react";

import { McDashboardActivity } from "@/components/mission-control/dashboard/mc-dashboard-activity";
import { McDashboardStats } from "@/components/mission-control/dashboard/mc-dashboard-stats";
import { McOperationsChart } from "@/components/mission-control/dashboard/mc-operations-chart";
import { McRecentOperations } from "@/components/mission-control/dashboard/mc-recent-operations";
import { McRevenueChart } from "@/components/mission-control/dashboard/mc-revenue-chart";
import { McWarehouseHealth } from "@/components/mission-control/dashboard/mc-warehouse-health";
import { QuickActionsPanel } from "@/components/mission-control/quick-actions/quick-actions-panel";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { buildDashboardStats } from "@/lib/mission-control/compute-dashboard-charts";

type McDashboardGridProps = ReturnType<typeof useMissionControlData>;

export function McDashboardGrid(props: McDashboardGridProps) {
  const {
    overview,
    operations,
    warehouseItems,
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

  return (
    <div className="flex flex-col gap-4">
      <DashboardImportProgress variant="compact" />

      {/* Efferd layout: 4 KPI → 2 charts → table → side panels */}
      <div className="mc-dashboard-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <McDashboardStats stats={stats} isLoading={isLoading} />

        {permissions.canAccounting ? (
          <>
            <McRevenueChart operations={operations} isLoading={isLoading} />
            <McOperationsChart operations={operations} isLoading={isLoading} />
            <McRecentOperations operations={operations} isLoading={isLoading} />
          </>
        ) : null}

        <McWarehouseHealth
          warehouseItems={warehouseItems}
          motorLowStock={overview.lowStockCount}
          isLoading={isLoading}
          canWarehouse={permissions.canWarehouse}
          canMotors={permissions.canMotors}
        />

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

      {permissions.canEmployees ? <QuickActionsPanel /> : null}
    </div>
  );
}
