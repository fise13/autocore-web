import {
  CircleDollarSign,
  FileText,
  LayoutGrid,
  Package,
  ClipboardList,
  Radar,
  Receipt,
  Sparkles,
  Tag,
  CircleUser,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { userCopy } from "@/lib/user-copy";

export type SidebarPosition = "left" | "right";

export type SidebarBlockId =
  | "navigation"
  | "context"
  | "documents"
  | "team"
  | "specific"
  | "brands"
  | "profile";

export type SidebarNavItemId =
  | "home"
  | "motors"
  | "sold"
  | "work_orders"
  | "accounting"
  | "warehouse"
  | "my_earnings";

export type SidebarCustomization = {
  version: 1;
  position: SidebarPosition;
  blockOrder: SidebarBlockId[];
  blocks: Record<SidebarBlockId, { enabled: boolean }>;
  navOrder: SidebarNavItemId[];
  navItems: Record<SidebarNavItemId, { enabled: boolean }>;
};

export const SIDEBAR_CUSTOMIZATION_STORAGE_KEY = "autocore-sidebar-customization-v1";
const WAREHOUSE_NAV_MIGRATION_KEY = "autocore-sidebar-warehouse-nav-v2";

export const DEFAULT_BLOCK_ORDER: SidebarBlockId[] = [
  "navigation",
  "context",
  "documents",
  "team",
  "specific",
  "brands",
  "profile",
];

export const DEFAULT_NAV_ORDER: SidebarNavItemId[] = [
  "home",
  "motors",
  "sold",
  "work_orders",
  "my_earnings",
  "accounting",
  "warehouse",
];

export const SIDEBAR_BLOCK_META: Record<
  SidebarBlockId,
  { label: string; description: string; icon: LucideIcon }
> = new Proxy({} as Record<SidebarBlockId, { label: string; description: string; icon: LucideIcon }>, {
  get(_target, prop: string) {
    const id = prop as SidebarBlockId;
    const icons: Record<SidebarBlockId, LucideIcon> = {
      navigation: LayoutGrid,
      context: Sparkles,
      documents: FileText,
      team: Users,
      specific: FileText,
      brands: Tag,
      profile: CircleUser,
    };
    if (!(id in icons)) return undefined;
    const copy = userCopy.nav.sidebarBlocks[id];
    return { label: copy.label, description: copy.description, icon: icons[id] };
  },
  ownKeys: () => [
    "navigation",
    "context",
    "documents",
    "team",
    "specific",
    "brands",
    "profile",
  ],
  getOwnPropertyDescriptor: (_t, prop) =>
    typeof prop === "string" &&
    ["navigation", "context", "documents", "team", "specific", "brands", "profile"].includes(prop)
      ? { enumerable: true, configurable: true }
      : undefined,
});

export const SIDEBAR_NAV_META: Record<
  SidebarNavItemId,
  { label: string; href: string; icon: LucideIcon }
> = new Proxy({} as Record<SidebarNavItemId, { label: string; href: string; icon: LucideIcon }>, {
  get(_target, prop: string) {
    const id = prop as SidebarNavItemId;
    const icons: Record<SidebarNavItemId, LucideIcon> = {
      home: Radar,
      motors: LayoutGrid,
      sold: Receipt,
      work_orders: ClipboardList,
      my_earnings: Wallet,
      accounting: CircleDollarSign,
      warehouse: Package,
    };
    const hrefs: Record<SidebarNavItemId, string> = {
      home: "/home",
      motors: "/motors?collection=engines",
      sold: "/sold",
      work_orders: "/work-orders",
      my_earnings: "/my-earnings",
      accounting: "/accounting",
      warehouse: "/warehouse",
    };
    if (!(id in icons)) return undefined;
    return { label: userCopy.nav.sidebarNav[id], href: hrefs[id], icon: icons[id] };
  },
  ownKeys: () => [
    "home",
    "motors",
    "sold",
    "work_orders",
    "my_earnings",
    "accounting",
    "warehouse",
  ],
  getOwnPropertyDescriptor: (_t, prop) =>
    typeof prop === "string" &&
    ["home", "motors", "sold", "work_orders", "my_earnings", "accounting", "warehouse"].includes(
      prop,
    )
      ? { enumerable: true, configurable: true }
      : undefined,
});

export const DEFAULT_SIDEBAR_CUSTOMIZATION: SidebarCustomization = {
  version: 1,
  position: "left",
  blockOrder: [...DEFAULT_BLOCK_ORDER],
  blocks: {
    navigation: { enabled: true },
    context: { enabled: true },
    documents: { enabled: true },
    team: { enabled: true },
    specific: { enabled: true },
    brands: { enabled: true },
    profile: { enabled: false },
  },
  navOrder: [...DEFAULT_NAV_ORDER],
  navItems: {
    home: { enabled: true },
    motors: { enabled: true },
    sold: { enabled: true },
    work_orders: { enabled: true },
    my_earnings: { enabled: true },
    accounting: { enabled: true },
    warehouse: { enabled: true },
  },
};

const ALL_BLOCK_IDS = new Set<SidebarBlockId>(DEFAULT_BLOCK_ORDER);
const ALL_NAV_IDS = new Set<SidebarNavItemId>(DEFAULT_NAV_ORDER);

function mergeUniqueOrder<T extends string>(stored: T[] | undefined, defaults: T[], allowed: Set<T>): T[] {
  const seen = new Set<T>();
  const merged: T[] = [];
  for (const id of stored ?? []) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  for (const id of defaults) {
    if (!seen.has(id)) merged.push(id);
  }
  return merged;
}

export function normalizeSidebarCustomization(
  input: Partial<SidebarCustomization> | null | undefined,
): SidebarCustomization {
  const base = DEFAULT_SIDEBAR_CUSTOMIZATION;
  if (!input) return base;

  const blockOrder = mergeUniqueOrder(input.blockOrder, DEFAULT_BLOCK_ORDER, ALL_BLOCK_IDS);
  const navOrder = mergeUniqueOrder(input.navOrder, DEFAULT_NAV_ORDER, ALL_NAV_IDS);

  const blocks = { ...base.blocks };
  for (const id of ALL_BLOCK_IDS) {
    if (id === "profile") {
      blocks.profile = { enabled: false };
      continue;
    }
    const enabled = input.blocks?.[id]?.enabled;
    blocks[id] = { enabled: typeof enabled === "boolean" ? enabled : base.blocks[id].enabled };
  }

  const navItems = { ...base.navItems };
  for (const id of ALL_NAV_IDS) {
    const enabled = input.navItems?.[id]?.enabled;
    navItems[id] = { enabled: typeof enabled === "boolean" ? enabled : base.navItems[id].enabled };
  }

  return {
    version: 1,
    position: input.position === "right" ? "right" : "left",
    blockOrder,
    blocks,
    navOrder,
    navItems,
  };
}

export function readSidebarCustomization(): SidebarCustomization {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_CUSTOMIZATION;
  try {
    const raw = localStorage.getItem(SIDEBAR_CUSTOMIZATION_STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_CUSTOMIZATION;
    let customization = normalizeSidebarCustomization(JSON.parse(raw) as Partial<SidebarCustomization>);

    // Consumables live under inventory nav and share the warehouse toggle.
    // v1 shipped with warehouse disabled — restore visibility once per browser.
    if (!localStorage.getItem(WAREHOUSE_NAV_MIGRATION_KEY)) {
      localStorage.setItem(WAREHOUSE_NAV_MIGRATION_KEY, "1");
      if (customization.navItems.warehouse?.enabled === false) {
        customization = {
          ...customization,
          navItems: {
            ...customization.navItems,
            warehouse: { enabled: true },
          },
        };
        writeSidebarCustomization(customization);
      }
    }

    return customization;
  } catch {
    return DEFAULT_SIDEBAR_CUSTOMIZATION;
  }
}

export function writeSidebarCustomization(customization: SidebarCustomization) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
}

export function isBlockEnabled(
  customization: SidebarCustomization,
  blockId: SidebarBlockId,
): boolean {
  return customization.blocks[blockId]?.enabled ?? true;
}

export function getEnabledNavItems(customization: SidebarCustomization): SidebarNavItemId[] {
  return customization.navOrder.filter((id) => customization.navItems[id]?.enabled !== false);
}
