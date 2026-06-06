"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { AccountingModule } from "@/components/mission-control/modules/accounting-module";
import { EmployeesModule } from "@/components/mission-control/modules/employees-module";
import { InventoryModule } from "@/components/mission-control/modules/inventory-module";
import { InventoryAnalyticsModule } from "@/components/mission-control/modules/inventory-analytics-module";
import { WarehouseModule } from "@/components/mission-control/modules/warehouse-module";
import { WorkOrdersModule } from "@/components/mission-control/modules/work-orders-module";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { mcCardVariants, mcPageVariants } from "@/lib/motion/mission-control-motion";

type ModuleGridProps = ReturnType<typeof useMissionControlData>;

function ModuleSlot({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={mcCardVariants} layout="position">
      {children}
    </motion.div>
  );
}

export function ModuleGrid({
  latestMotors,
  recentlyModifiedMotors,
  recentWarehouseItems,
  lowStockWarehouseItems,
  warehouseMovements,
  overview,
  inventoryAnalytics,
  operations,
  workOrders,
  employees,
  activityLogs,
  isLoading,
  permissions,
}: ModuleGridProps) {
  const showAnyModule =
    permissions.canMotors ||
    permissions.canWarehouse ||
    permissions.canAccounting ||
    permissions.canWorkOrders ||
    permissions.canEmployees;

  if (!showAnyModule) return null;

  return (
    <motion.div
      variants={mcPageVariants}
      initial="hidden"
      animate="show"
      className="grid gap-3.5 xl:grid-cols-2"
    >
      {permissions.canMotors ? (
        <ModuleSlot>
          <InventoryAnalyticsModule analytics={inventoryAnalytics} isLoading={isLoading} />
        </ModuleSlot>
      ) : null}
      {permissions.canMotors ? (
        <ModuleSlot>
          <InventoryModule
            latestMotors={latestMotors}
            recentlyModified={recentlyModifiedMotors}
            isLoading={isLoading}
          />
        </ModuleSlot>
      ) : null}
      {permissions.canWarehouse ? (
        <ModuleSlot>
          <WarehouseModule
            recentItems={recentWarehouseItems}
            lowStockItems={lowStockWarehouseItems}
            recentMovements={warehouseMovements}
            stockValue={overview.warehouseStockValue}
            isLoading={isLoading}
          />
        </ModuleSlot>
      ) : null}
      {permissions.canAccounting ? (
        <ModuleSlot>
          <AccountingModule operations={operations} isLoading={isLoading} />
        </ModuleSlot>
      ) : null}
      {permissions.canWorkOrders ? (
        <ModuleSlot>
          <WorkOrdersModule orders={workOrders} isLoading={isLoading} />
        </ModuleSlot>
      ) : null}
      {permissions.canEmployees ? (
        <ModuleSlot>
          <EmployeesModule employees={employees} activityLogs={activityLogs} isLoading={isLoading} />
        </ModuleSlot>
      ) : null}
    </motion.div>
  );
}
