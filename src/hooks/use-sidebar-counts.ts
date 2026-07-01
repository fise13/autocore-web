"use client";

import { useMemo } from "react";

import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import type { UserEntity } from "@/domain/user";
import type { InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { INVENTORY_COLLECTIONS } from "@/lib/navigation/inventory-collections";
import { buildConsumablesSubcategoryIndex } from "@/lib/warehouse/inventory-subcategory-index";
import {
  countInventoryByFilter,
  countMotorsByFilter,
  PINNED_FILTER_IDS,
  type PinnedFilterId,
} from "@/lib/navigation/pinned-filters";
import { countMotorsByBrand } from "@/lib/catalog-brand-counts";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { canAccessMotorsArea, isNavAllowed } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const motorRepository = createMotorRepository();
const inventoryItemRepository = createInventoryItemRepository();
const workOrderRepository = createWorkOrderRepository();

type UseSidebarCountsParams = {
  profile: UserEntity | null;
  uid: string;
  companyId: string;
  brands: BrandEntity[];
  soldOnly?: boolean;
  enabled?: boolean;
};

export type SidebarCounts = {
  inventoryByCollection: Record<InventoryCollectionId, number>;
  salesCount: number;
  workOrdersOpen: number;
  filterCounts: Record<PinnedFilterId, number>;
  brandCounts: Map<number, number>;
  consumablesCount: number;
  consumableSubcategoryCounts: Map<InventorySubcategoryId, number>;
  consumableUncategorizedCount: number;
};

const EMPTY_FILTER_COUNTS = Object.fromEntries(
  PINNED_FILTER_IDS.map((id) => [id, 0]),
) as Record<PinnedFilterId, number>;

export function useSidebarCounts({
  profile,
  uid,
  companyId,
  brands,
  soldOnly = false,
  enabled = true,
}: UseSidebarCountsParams): SidebarCounts {
  const canMotors = canAccessMotorsArea(profile);
  const canWarehouse = isNavAllowed(profile, "warehouse") || can(profile, "inventory_view");
  const canWorkOrders = can(profile, "work_orders_view");
  const active = enabled && Boolean(uid && companyId);

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: active && canMotors,
  });

  const soldMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    soldOnly: true,
    availability: "sold",
    enabled: active && canMotors,
  });

  const warehouseQuery = useInventoryRealtime(
    inventoryItemRepository,
    companyId,
    active && canWarehouse,
  );

  const workOrdersQuery = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    active && canWorkOrders,
  );

  return useMemo(() => {
    const motors = (motorsQuery.data ?? []).filter((motor) => !motor.deletedAt);
    const soldMotors = (soldMotorsQuery.data ?? []).filter((motor) => !motor.deletedAt);
    const warehouseItems = warehouseQuery.data ?? [];
    const workOrders = workOrdersQuery.orders ?? [];

    const availableMotors = motors.filter((motor) => !motor.soldDate);
    const brandSource = soldOnly ? soldMotors : availableMotors;
    const brandCounts = countMotorsByBrand(brands, brandSource);

    const filterCounts = Object.fromEntries(
      PINNED_FILTER_IDS.map((filter) => {
        const motorCount = countMotorsByFilter(motors, filter);
        const warehouseCount = countInventoryByFilter(warehouseItems, filter);
        return [filter, motorCount + warehouseCount];
      }),
    ) as Record<PinnedFilterId, number>;

    const activeWarehouseItems = warehouseItems.filter((item) => item.status !== "archived");
    const consumablesIndex = buildConsumablesSubcategoryIndex(activeWarehouseItems);
    const consumablesCount = consumablesIndex.activeItems.length;
    const consumableSubcategoryCounts = consumablesIndex.counts;
    const consumableUncategorizedCount = consumablesIndex.uncategorizedCount;

    const inventoryByCollection = INVENTORY_COLLECTIONS.reduce(
      (acc, id) => {
        if (id === "engines") acc[id] = availableMotors.length;
        else if (id === "consumables") acc[id] = consumablesCount;
        else acc[id] = 0;
        return acc;
      },
      {} as Record<InventoryCollectionId, number>,
    );

    const openStatuses = new Set(["draft", "confirmed", "in_progress", "waiting_parts"]);
    const workOrdersOpen = workOrders.filter((order) => openStatuses.has(order.status)).length;

    return {
      inventoryByCollection,
      salesCount: soldMotors.length,
      workOrdersOpen,
      filterCounts,
      brandCounts,
      consumablesCount,
      consumableSubcategoryCounts,
      consumableUncategorizedCount,
    };
  }, [
    brands,
    motorsQuery.data,
    soldMotorsQuery.data,
    soldOnly,
    warehouseQuery.data,
    workOrdersQuery.orders,
  ]);
}

export function emptySidebarCounts(): SidebarCounts {
  return {
    inventoryByCollection: {
      engines: 0,
      transmissions: 0,
      parts: 0,
      consumables: 0,
    },
    salesCount: 0,
    workOrdersOpen: 0,
    filterCounts: { ...EMPTY_FILTER_COUNTS },
    brandCounts: new Map(),
    consumablesCount: 0,
    consumableSubcategoryCounts: new Map(),
    consumableUncategorizedCount: 0,
  };
}
