import type { BusinessNavId } from "@/lib/navigation/business-navigation";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import {
  SIDEBAR_BLOCK_META,
  SIDEBAR_NAV_META,
  type SidebarBlockId,
  type SidebarCustomization,
  type SidebarNavItemId,
  getEnabledNavItems,
  isBlockEnabled,
} from "@/lib/navigation/sidebar-customization";

export const BUSINESS_NAV_TO_SIDEBAR_ID: Record<BusinessNavId, SidebarNavItemId> = {
  dashboard: "home",
  inventory: "motors",
  sales: "sold",
  work_orders: "work_orders",
  accounting: "accounting",
  documents: "motors",
  my_earnings: "my_earnings",
};

export function collectionToSidebarNavId(
  collection: InventoryCollectionId,
): SidebarNavItemId {
  return collection === "consumables" ? "warehouse" : "motors";
}

export function isSidebarNavEnabled(
  customization: SidebarCustomization,
  navId: SidebarNavItemId,
): boolean {
  return customization.navItems[navId]?.enabled !== false;
}

export function isInventoryNavVisible(customization: SidebarCustomization): boolean {
  return isSidebarNavEnabled(customization, "motors") || isSidebarNavEnabled(customization, "warehouse");
}

export function isCollectionNavEnabled(
  customization: SidebarCustomization,
  collection: InventoryCollectionId,
): boolean {
  return isSidebarNavEnabled(customization, collectionToSidebarNavId(collection));
}

export function sortByNavOrder<T>(
  items: T[],
  getNavId: (item: T) => SidebarNavItemId,
  customization: SidebarCustomization,
): T[] {
  const order = customization.navOrder;
  return [...items].sort((left, right) => {
    const leftIndex = order.indexOf(getNavId(left));
    const rightIndex = order.indexOf(getNavId(right));
    return (leftIndex === -1 ? order.length : leftIndex) - (rightIndex === -1 ? order.length : rightIndex);
  });
}

export function getDisabledNavItems(
  customization: SidebarCustomization,
  allowed: SidebarNavItemId[],
): SidebarNavItemId[] {
  const allowedSet = new Set(allowed);
  return customization.navOrder.filter(
    (navId) => allowedSet.has(navId) && !isSidebarNavEnabled(customization, navId),
  );
}

export function getDisabledBlocks(customization: SidebarCustomization): SidebarBlockId[] {
  return customization.blockOrder.filter(
    (blockId) => blockId !== "profile" && !isBlockEnabled(customization, blockId),
  );
}

export function setNavItemEnabled(
  customization: SidebarCustomization,
  navId: SidebarNavItemId,
  enabled: boolean,
): SidebarCustomization {
  return {
    ...customization,
    navItems: {
      ...customization.navItems,
      [navId]: { enabled },
    },
  };
}

export function setBlockEnabled(
  customization: SidebarCustomization,
  blockId: SidebarBlockId,
  enabled: boolean,
): SidebarCustomization {
  return {
    ...customization,
    blocks: {
      ...customization.blocks,
      [blockId]: { enabled },
    },
  };
}

export function reorderNavItems(
  customization: SidebarCustomization,
  fromIndex: number,
  toIndex: number,
): SidebarCustomization {
  const nextOrder = [...customization.navOrder];
  const [item] = nextOrder.splice(fromIndex, 1);
  if (!item) return customization;
  nextOrder.splice(toIndex, 0, item);
  return { ...customization, navOrder: nextOrder };
}

export function visibleNavLabels(customization: SidebarCustomization): string[] {
  return getEnabledNavItems(customization).map((id) => SIDEBAR_NAV_META[id].label);
}

export function disabledBlockLabels(customization: SidebarCustomization): string[] {
  return getDisabledBlocks(customization).map((id) => SIDEBAR_BLOCK_META[id].label);
}
