import {
  FileText,
  Folder,
  LayoutGrid,
  Package,
  ClipboardList,
  Radar,
  Receipt,
  Sparkles,
  Tag,
  UserCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type SidebarPosition = "left" | "right";

export type SidebarBlockId = "navigation" | "context" | "specific" | "brands" | "profile";

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

export const DEFAULT_BLOCK_ORDER: SidebarBlockId[] = [
  "navigation",
  "context",
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
> = {
  navigation: {
    label: "Разделы",
    description: "Центр управления, моторы, склад…",
    icon: LayoutGrid,
  },
  context: {
    label: "Действия раздела",
    description: "Кнопки для текущей страницы",
    icon: Sparkles,
  },
  specific: {
    label: "Специфичные",
    description: "Коробки, раздатки, ЭБУ — не бренды моторов",
    icon: FileText,
  },
  brands: {
    label: "Бренды",
    description: "Фильтр по брендам и двигателям",
    icon: Tag,
  },
  profile: {
    label: "Профиль",
    description: "Почта и роль внизу панели",
    icon: UserCircle,
  },
};

export const SIDEBAR_NAV_META: Record<
  SidebarNavItemId,
  { label: string; href: string; icon: LucideIcon }
> = {
  home: { label: "Центр управления", href: "/", icon: Radar },
  motors: { label: "Все моторы", href: "/motors", icon: LayoutGrid },
  sold: { label: "Проданные", href: "/sold", icon: Receipt },
  work_orders: { label: "Заказ-наряды", href: "/work-orders", icon: ClipboardList },
  my_earnings: { label: "Мои начисления", href: "/my-earnings", icon: Wallet },
  accounting: { label: "Бухгалтерия", href: "/accounting", icon: Folder },
  warehouse: { label: "Склад", href: "/warehouse", icon: Package },
};

export const DEFAULT_SIDEBAR_CUSTOMIZATION: SidebarCustomization = {
  version: 1,
  position: "left",
  blockOrder: [...DEFAULT_BLOCK_ORDER],
  blocks: {
    navigation: { enabled: true },
    context: { enabled: true },
    specific: { enabled: true },
    brands: { enabled: true },
    profile: { enabled: true },
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
    return normalizeSidebarCustomization(JSON.parse(raw) as Partial<SidebarCustomization>);
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
