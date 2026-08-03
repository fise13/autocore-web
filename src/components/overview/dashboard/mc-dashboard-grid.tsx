"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

import { McDashboardActivity } from "@/components/overview/dashboard/mc-dashboard-activity";
import { McDashboardStats } from "@/components/overview/dashboard/mc-dashboard-stats";
import { McOperationsChart } from "@/components/overview/dashboard/mc-operations-chart";
import { McRecentOperations } from "@/components/overview/dashboard/mc-recent-operations";
import { McRevenueChart } from "@/components/overview/dashboard/mc-revenue-chart";
import { McTeamOnDuty } from "@/components/overview/dashboard/mc-team-on-duty";
import { McWarehouseHealth } from "@/components/overview/dashboard/mc-warehouse-health";
import { McWorkOrdersChart } from "@/components/overview/dashboard/mc-work-orders-chart";
import { QuickActionsPanel } from "@/components/overview/quick-actions/quick-actions-panel";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { useOverviewData } from "@/hooks/use-overview-data";
import { buildDashboardStats } from "@/lib/overview/compute-dashboard-charts";
import { mcPageVariants } from "@/lib/motion/overview-motion";

type McDashboardGridProps = ReturnType<typeof useOverviewData>;

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
  const { formatMoney } = useAppDisplayCurrency();

  const stats = useMemo(
    () =>
      buildDashboardStats({
        metrics: overview,
        operations: permissions.canAccounting ? operations : [],
        permissions,
        formatMoney,
      }),
    [formatMoney, operations, overview, permissions],
  );

  const motorAvailable = overview.activeInventoryCount;
  const reducedMotion = useReducedMotion();

  const grid = (
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

  if (reducedMotion) return grid;

  return (
    <motion.div initial="hidden" animate="show" variants={mcPageVariants}>
      {grid}
    </motion.div>
  );
}
