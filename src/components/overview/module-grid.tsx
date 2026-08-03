"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { AccountingModule } from "@/components/overview/modules/accounting-module";
import { EmployeesModule } from "@/components/overview/modules/employees-module";
import { InventoryModule } from "@/components/overview/modules/inventory-module";
import { InventoryAnalyticsModule } from "@/components/overview/modules/inventory-analytics-module";
import { WarehouseModule } from "@/components/overview/modules/warehouse-module";
import { WorkOrdersModule } from "@/components/overview/modules/work-orders-module";
import { useOverviewData } from "@/hooks/use-overview-data";
import { mcCardVariants, mcPageVariants } from "@/lib/motion/overview-motion";

type ModuleGridProps = ReturnType<typeof useOverviewData> & {
  layout?: "all" | "featured" | "rest";
};

function ModuleSlot({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={mcCardVariants} layout="position">
      {children}
    </motion.div>
  );
}

const FEATURED_KEYS = new Set(["analytics", "accounting"]);

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
  layout = "all",
}: ModuleGridProps) {
  const slots: Array<{ key: string; node: ReactNode }> = [];

  if (permissions.canMotors) {
    slots.push({
      key: "analytics",
      node: <InventoryAnalyticsModule analytics={inventoryAnalytics} isLoading={isLoading} />,
    });
    slots.push({
      key: "inventory",
      node: (
        <InventoryModule
          latestMotors={latestMotors}
          recentlyModified={recentlyModifiedMotors}
          isLoading={isLoading}
        />
      ),
    });
  }

  if (permissions.canWarehouse) {
    slots.push({
      key: "warehouse",
      node: (
        <WarehouseModule
          recentItems={recentWarehouseItems}
          lowStockItems={lowStockWarehouseItems}
          recentMovements={warehouseMovements}
          stockValue={overview.warehouseStockValue}
          isLoading={isLoading}
        />
      ),
    });
  }

  if (permissions.canAccounting) {
    slots.push({
      key: "accounting",
      node: <AccountingModule operations={operations} isLoading={isLoading} />,
    });
  }

  if (permissions.canWorkOrders) {
    slots.push({
      key: "work-orders",
      node: <WorkOrdersModule orders={workOrders} isLoading={isLoading} />,
    });
  }

  if (permissions.canEmployees) {
    slots.push({
      key: "employees",
      node: <EmployeesModule employees={employees} activityLogs={activityLogs} isLoading={isLoading} />,
    });
  }

  const filtered =
    layout === "featured"
      ? slots.filter((slot) => FEATURED_KEYS.has(slot.key))
      : layout === "rest"
        ? slots.filter((slot) => !FEATURED_KEYS.has(slot.key))
        : slots;

  if (filtered.length === 0) return null;

  return (
    <motion.div
      variants={mcPageVariants}
      initial="hidden"
      animate="show"
      className="grid gap-4 lg:grid-cols-2"
    >
      {filtered.map((slot) => (
        <ModuleSlot key={slot.key}>{slot.node}</ModuleSlot>
      ))}
    </motion.div>
  );
}
