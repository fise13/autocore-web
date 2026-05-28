"use client";

import { motion } from "framer-motion";

import { AccountingModule } from "@/components/mission-control/modules/accounting-module";
import { EmployeesModule } from "@/components/mission-control/modules/employees-module";
import { InventoryModule } from "@/components/mission-control/modules/inventory-module";
import { WarehouseModule } from "@/components/mission-control/modules/warehouse-module";
import { OperationsStatsModule } from "@/components/mission-control/modules/operations-stats-module";
import { useMissionControlData } from "@/hooks/use-mission-control-data";

type ModuleGridProps = ReturnType<typeof useMissionControlData>;

export function ModuleGrid({
  latestMotors,
  recentlyModifiedMotors,
  recentOperations,
  recentWarehouseItems,
  lowStockWarehouseItems,
  warehouseMovements,
  overview,
  operations,
  employees,
  activityLogs,
  operationsStats,
  isLoading,
  permissions,
}: ModuleGridProps) {
  const showAnyModule =
    permissions.canInventory ||
    permissions.canAccounting ||
    permissions.canEmployees ||
    true;

  if (!showAnyModule) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4 }}
      className="grid gap-4 xl:grid-cols-2"
    >
      {permissions.canInventory ? (
        <InventoryModule
          latestMotors={latestMotors}
          recentlyModified={recentlyModifiedMotors}
          isLoading={isLoading}
        />
      ) : null}
      {permissions.canInventory ? (
        <WarehouseModule
          recentItems={recentWarehouseItems}
          lowStockItems={lowStockWarehouseItems}
          recentMovements={warehouseMovements}
          stockValue={overview.warehouseStockValue}
          isLoading={isLoading}
        />
      ) : null}
      {permissions.canAccounting ? (
        <AccountingModule operations={operations} isLoading={isLoading} />
      ) : null}
      {permissions.canEmployees ? (
        <EmployeesModule employees={employees} activityLogs={activityLogs} isLoading={isLoading} />
      ) : null}
      <OperationsStatsModule stats={operationsStats} isLoading={isLoading} />
    </motion.div>
  );
}
