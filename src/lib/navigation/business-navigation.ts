import {
  CircleDollarSign,
  Camera,
  ClipboardList,
  Cog,
  FileText,
  LayoutGrid,
  Package,
  Puzzle,
  Receipt,
  Settings2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { UserEntity } from "@/domain/user";
import {
  canAccessOverview,
  canAccessMyEarnings,
  canAccessMotorsArea,
  isNavAllowed,
} from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { businessNavCopy, inventoryCollectionLabel } from "@/lib/navigation/business-nav-copy";
import {
  INVENTORY_COLLECTIONS,
  type InventoryCollectionId,
  buildCollectionHref,
} from "@/lib/navigation/inventory-collections";

export type BusinessNavId =
  | "dashboard"
  | "inventory"
  | "engine_intake"
  | "sales"
  | "work_orders"
  | "accounting"
  | "documents"
  | "my_earnings";

export type BusinessNavItem = {
  id: BusinessNavId;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: InventoryCollectionNavItem[];
};

export type InventoryCollectionNavItem = {
  id: InventoryCollectionId;
  label: string;
  href: string;
  icon: LucideIcon;
};

const COLLECTION_ICONS: Record<InventoryCollectionId, LucideIcon> = {
  engines: Cog,
  transmissions: Settings2,
  parts: Puzzle,
  consumables: Package,
};

export const INVENTORY_COLLECTION_NAV: InventoryCollectionNavItem[] = INVENTORY_COLLECTIONS.map(
  (collection) => ({
    id: collection,
    label: inventoryCollectionLabel(collection),
    href: buildCollectionHref({ collection }),
    icon: COLLECTION_ICONS[collection],
  }),
);

export const PRIMARY_BUSINESS_NAV_IDS: BusinessNavId[] = [
  "inventory",
  "engine_intake",
  "sales",
  "work_orders",
  "accounting",
];

export function buildBusinessNavTree(user: UserEntity | null | undefined): {
  workspace: { id: "dashboard"; label: string; href: string; icon: LucideIcon } | null;
  business: BusinessNavItem[];
} {
  const workspace = canAccessOverview(user)
    ? {
        id: "dashboard" as const,
        label: businessNavCopy.workspace.dashboard,
        href: "/",
        icon: LayoutGrid,
      }
    : null;

  const business: BusinessNavItem[] = [];

  if (canAccessInventory(user)) {
    business.push({
      id: "inventory",
      label: businessNavCopy.business.inventory,
      href: buildCollectionHref({ collection: "engines" }),
      icon: Package,
      children: INVENTORY_COLLECTION_NAV.filter((item) => isCollectionAllowed(user, item.id)).map(
        (item) => ({
          ...item,
          label: inventoryCollectionLabel(item.id),
        }),
      ),
    });
  }

  if (isNavAllowed(user, "engine_intake")) {
    business.push({
      id: "engine_intake",
      label: businessNavCopy.business.engineIntake,
      href: "/engine-intake",
      icon: Camera,
    });
  }

  if (isNavAllowed(user, "sold")) {
    business.push({
      id: "sales",
      label: businessNavCopy.business.sales,
      href: "/sold",
      icon: Receipt,
    });
  }

  if (isNavAllowed(user, "work_orders")) {
    business.push({
      id: "work_orders",
      label: businessNavCopy.business.workOrders,
      href: "/work-orders",
      icon: ClipboardList,
    });
  }

  if (isNavAllowed(user, "accounting")) {
    business.push({
      id: "accounting",
      label: businessNavCopy.business.accounting,
      href: "/accounting",
      icon: CircleDollarSign,
    });
  }

  if (canAccessDocuments(user)) {
    business.push({
      id: "documents",
      label: businessNavCopy.business.documents,
      href: "/documents",
      icon: FileText,
    });
  }

  if (canAccessMyEarnings(user)) {
    business.push({
      id: "my_earnings",
      label: businessNavCopy.business.myEarnings,
      href: "/my-earnings",
      icon: Wallet,
    });
  }

  return { workspace, business };
}

function canAccessInventory(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return (
    canAccessMotorsArea(user) ||
    isNavAllowed(user, "warehouse") ||
    can(user, "inventory_view")
  );
}

function isCollectionAllowed(
  user: UserEntity | null | undefined,
  collection: InventoryCollectionId,
): boolean {
  if (!user || !can(user, "inventory_view")) return false;
  if (collection === "consumables") {
    return isNavAllowed(user, "warehouse") || canAccessMotorsArea(user);
  }
  return canAccessMotorsArea(user);
}

function canAccessDocuments(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return (
    can(user, "settings_manage") ||
    can(user, "work_orders_view") ||
    can(user, "accounting_view")
  );
}

export function countPrimaryNavItems(business: BusinessNavItem[]): number {
  return business.filter((item) => PRIMARY_BUSINESS_NAV_IDS.includes(item.id)).length;
}

export function isBusinessNavActive(
  item: BusinessNavItem,
  pathname: string,
  collection: InventoryCollectionId | null,
): boolean {
  switch (item.id) {
    case "inventory":
      return pathname === "/motors" || pathname === "/warehouse" || pathname.startsWith("/specific/");
    case "sales":
      return pathname === "/sold";
    case "engine_intake":
      return pathname.startsWith("/engine-intake");
    case "work_orders":
      return pathname.startsWith("/work-orders");
    case "accounting":
      return pathname.startsWith("/accounting");
    case "documents":
      return pathname.startsWith("/documents");
    case "my_earnings":
      return pathname.startsWith("/my-earnings");
    default:
      return false;
  }
}

export function isCollectionNavActive(
  collectionId: InventoryCollectionId,
  pathname: string,
  activeCollection: InventoryCollectionId,
): boolean {
  if (collectionId === "consumables") {
    return pathname === "/warehouse" && activeCollection === "consumables";
  }
  return (
    (pathname === "/motors" || pathname.startsWith("/specific/")) &&
    activeCollection === collectionId
  );
}
