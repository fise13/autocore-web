import { userCopy } from "@/lib/user-copy";

export type ProductUpdateTag =
  | "motors"
  | "warehouse"
  | "work-orders"
  | "documents"
  | "team"
  | "settings";

export type ProductUpdate = {
  id: string;
  date: string;
  title: string;
  summary: string;
  details?: string[];
  href?: string;
  tags?: ProductUpdateTag[];
  highlight?: boolean;
};

type ProductUpdateItemKey = keyof typeof userCopy.product.updates.items;

/** Structural metadata; titles/summaries come from userCopy at call time. */
const PRODUCT_UPDATE_META: Array<{
  id: string;
  date: string;
  copyKey: ProductUpdateItemKey;
  href: string;
  tags: ProductUpdateTag[];
  highlight?: boolean;
}> = [
  {
    id: "2026-06-motor-sale-client",
    date: "2026-06-20",
    copyKey: "motorSaleClient",
    href: "/motors",
    tags: ["motors", "documents"],
    highlight: true,
  },
  {
    id: "2026-06-inventory-subcategories",
    date: "2026-06-12",
    copyKey: "inventorySubcategories",
    href: "/warehouse",
    tags: ["warehouse"],
  },
  {
    id: "2026-05-gradient-avatars",
    date: "2026-05-28",
    copyKey: "gradientAvatars",
    href: "/team",
    tags: ["team"],
  },
  {
    id: "2026-05-sidebar-customize",
    date: "2026-05-15",
    copyKey: "sidebarCustomize",
    href: "/settings",
    tags: ["settings"],
  },
];

export function getProductUpdateTagLabels(): Record<ProductUpdateTag, string> {
  return { ...userCopy.product.updates.tags };
}

/** Locale-aware tag labels — read at call/render time. */
export const productUpdateTagLabels: Record<ProductUpdateTag, string> = new Proxy(
  {} as Record<ProductUpdateTag, string>,
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return userCopy.product.updates.tags[prop as ProductUpdateTag];
    },
    ownKeys() {
      return Reflect.ownKeys(userCopy.product.updates.tags);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return {
        configurable: true,
        enumerable: true,
        value: userCopy.product.updates.tags[prop as ProductUpdateTag],
      };
    },
    has(_target, prop) {
      return Reflect.has(userCopy.product.updates.tags, prop);
    },
  },
);

export function getProductUpdates(): ProductUpdate[] {
  const items = userCopy.product.updates.items;
  return PRODUCT_UPDATE_META.map((meta) => {
    const copy = items[meta.copyKey];
    return {
      id: meta.id,
      date: meta.date,
      title: copy.title,
      summary: copy.summary,
      details: [...copy.details],
      href: meta.href,
      tags: [...meta.tags],
      highlight: meta.highlight,
    };
  });
}

export function getHighlightedProductUpdate(): ProductUpdate | null {
  const updates = getProductUpdates();
  return updates.find((update) => update.highlight) ?? updates[0] ?? null;
}

export function getProductUpdateById(id: string): ProductUpdate | undefined {
  return getProductUpdates().find((update) => update.id === id);
}

export function sortProductUpdatesByDate(updates: ProductUpdate[]): ProductUpdate[] {
  return [...updates].sort((a, b) => b.date.localeCompare(a.date));
}
