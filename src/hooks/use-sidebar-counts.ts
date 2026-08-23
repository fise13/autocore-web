"use client";

import { useMemo } from "react";

import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import type { UserEntity } from "@/domain/user";
import type { InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { INVENTORY_COLLECTIONS } from "@/lib/navigation/inventory-collections";
import { specificCategoriesForCollection } from "@/lib/navigation/specific-categories-for-collection";
import { buildConsumablesSubcategoryIndex } from "@/lib/warehouse/inventory-subcategory-index";
import {
  countInventoryByFilter,
  countMotorsByFilter,
  PINNED_FILTER_IDS,
  type PinnedFilterId,
} from "@/lib/navigation/pinned-filters";
import { countMotorsByBrand } from "@/lib/catalog-brand-counts";
import { useAllSpecificRecordsRealtime } from "@/hooks/use-all-specific-records-realtime";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { canAccessMotorsArea, isNavAllowed } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import {
  buildSpecificHeaderMapping,
  isSpecificRecordSold,
} from "@/lib/specific/specific-header-mapping";

const motorRepository = createMotorRepository();
const inventoryItemRepository = createInventoryItemRepository();
const workOrderRepository = createWorkOrderRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

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

  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    active && canMotors,
  );
  const specificRecordsQuery = useAllSpecificRecordsRealtime(
    specificCategoryRepository,
    active && canMotors ? companyId : "",
  );

  return useMemo(() => {
    const motors = (motorsQuery.data ?? []).filter((motor) => !motor.deletedAt);
    const soldMotors = (soldMotorsQuery.data ?? []).filter((motor) => !motor.deletedAt);
    const warehouseItems = warehouseQuery.data ?? [];
    const workOrders = workOrdersQuery.orders ?? [];
    const specificRecords = specificRecordsQuery.records ?? [];

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

    const activeWarehouseItems = warehouseItems.filter((item) => {
      if (item.status === "archived") return false;
      return (item.inventoryGroup ?? "consumables") === "consumables";
    });
    const consumablesIndex = buildConsumablesSubcategoryIndex(activeWarehouseItems);
    const consumablesCount = consumablesIndex.activeItems.length;
    const consumableSubcategoryCounts = consumablesIndex.counts;
    const consumableUncategorizedCount = consumablesIndex.uncategorizedCount;

    const specificMapping = buildSpecificHeaderMapping(specificRecords);
    const availableSpecificRecords = soldOnly
      ? specificRecords.filter((record) => isSpecificRecordSold(record, specificMapping))
      : specificRecords.filter((record) => !isSpecificRecordSold(record, specificMapping));

    const transmissionCategoryIds = new Set(
      specificCategoriesForCollection("transmissions", specificCategories).map(
        (category) => category.id,
      ),
    );
    const partsCategoryIds = new Set(
      specificCategoriesForCollection("parts", specificCategories).map((category) => category.id),
    );

    const transmissionsCount = availableSpecificRecords.filter((record) =>
      transmissionCategoryIds.has(record.categoryId),
    ).length;
    const partsCount = availableSpecificRecords.filter((record) =>
      partsCategoryIds.has(record.categoryId),
    ).length;

    const inventoryByCollection = INVENTORY_COLLECTIONS.reduce(
      (acc, id) => {
        if (id === "engines") acc[id] = availableMotors.length;
        else if (id === "transmissions") acc[id] = transmissionsCount;
        else if (id === "parts") acc[id] = partsCount;
        else acc[id] = consumablesCount;
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
    specificCategories,
    specificRecordsQuery.records,
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
