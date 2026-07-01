import type { UserEntity } from "@/domain/user";
import type { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import type { AutocoreNavGroup, AutocoreNavItem } from "@/components/layout/business-sidebar/autocore-nav-types";
import type { SidebarCounts } from "@/hooks/use-sidebar-counts";
import {
  buildBusinessNavTree,
  isBusinessNavActive,
  isCollectionNavActive,
  type BusinessNavItem,
} from "@/lib/navigation/business-navigation";
import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import {
  BUSINESS_NAV_TO_SIDEBAR_ID,
  collectionToSidebarNavId,
  isCollectionNavEnabled,
  isInventoryNavVisible,
  isSidebarNavEnabled,
  sortByNavOrder,
} from "@/lib/navigation/sidebar-edit-model";
import {
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  type SidebarCustomization,
  type SidebarNavItemId,
} from "@/lib/navigation/sidebar-customization";
import { createElement } from "react";

const BRAND_COLLECTIONS = new Set<InventoryCollectionId>(["engines", "transmissions", "parts"]);

export function shouldShowBrandsSidebarGroup(
  pathname: string,
  activeCollection: InventoryCollectionId,
): boolean {
  const isMotorCatalogRoute = pathname === "/motors" || pathname === "/sold";
  return isMotorCatalogRoute && BRAND_COLLECTIONS.has(activeCollection);
}

type BuildAutocoreNavGroupsInput = {
  profile: UserEntity | null;
  pathname: string;
  activeCollection: InventoryCollectionId;
  activeBrandLocalId?: number;
  counts: SidebarCounts;
  brands: BrandEntity[];
  soldRoute?: boolean;
  customization?: SidebarCustomization;
};

export function buildAutocoreNavGroups({
  profile,
  pathname,
  activeCollection,
  activeBrandLocalId,
  counts,
  brands,
  soldRoute = false,
  customization = DEFAULT_SIDEBAR_CUSTOMIZATION,
}: BuildAutocoreNavGroupsInput): AutocoreNavGroup[] {
  const { workspace, business } = buildBusinessNavTree(profile);
  const groups: AutocoreNavGroup[] = [];

  if (workspace && isSidebarNavEnabled(customization, "home")) {
    groups.push({
      items: [
        {
          title: workspace.label,
          path: workspace.href,
          icon: createElement(workspace.icon),
          isActive: pathname === "/",
          navId: "home",
        },
      ],
    });
  }

  const businessNavItems: AutocoreNavItem[] = [];

  const orderedBusiness = sortByNavOrder(
    business,
    (item) => BUSINESS_NAV_TO_SIDEBAR_ID[item.id],
    customization,
  );

  for (const item of orderedBusiness) {
    const navId = BUSINESS_NAV_TO_SIDEBAR_ID[item.id];
    if (item.id !== "documents" && item.id !== "inventory" && !isSidebarNavEnabled(customization, navId)) {
      continue;
    }

    if (item.id === "inventory") {
      if (!isInventoryNavVisible(customization)) continue;
      const visibleChildren = (item.children ?? []).filter((child) =>
        isCollectionNavEnabled(customization, child.id),
      );
      if (visibleChildren.length === 0) continue;

      const inventoryTotal = visibleChildren.reduce(
        (sum, child) => sum + (counts.inventoryByCollection[child.id] ?? 0),
        0,
      );
      businessNavItems.push({
        title: item.label,
        icon: createElement(item.icon),
        isActive: isBusinessNavActive(item, pathname, activeCollection),
        badge: inventoryTotal > 0 ? inventoryTotal : undefined,
        navId: "motors",
        subItems: visibleChildren.map((child) => ({
          title: child.label,
          path: child.href,
          icon: createElement(child.icon),
          isActive: isCollectionNavActive(child.id, pathname, activeCollection),
          navId: collectionToSidebarNavId(child.id),
          badge:
            (counts.inventoryByCollection[child.id] ?? 0) > 0
              ? counts.inventoryByCollection[child.id]
              : undefined,
        })),
      });
      continue;
    }

    const badge =
      item.id === "sales"
        ? counts.salesCount
        : item.id === "work_orders"
          ? counts.workOrdersOpen
          : undefined;
    businessNavItems.push(buildFlatBusinessNavItem(item, pathname, activeCollection, badge, navId));
  }

  if (businessNavItems.length > 0) {
    groups.push({
      label: "Бизнес",
      items: businessNavItems,
    });
  }

  return groups;
}

function buildFlatBusinessNavItem(
  item: BusinessNavItem,
  pathname: string,
  activeCollection: InventoryCollectionId,
  badge: number | undefined,
  navId: SidebarNavItemId,
): AutocoreNavItem {
  return {
    title: item.label,
    path: item.href,
    icon: createElement(item.icon),
    isActive: isBusinessNavActive(item, pathname, activeCollection),
    badge: badge && badge > 0 ? badge : undefined,
    navId,
  };
}
