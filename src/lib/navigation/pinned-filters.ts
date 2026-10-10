import { differenceInCalendarDays } from "date-fns";

import type { InventoryItem } from "@/domain/inventory";
import type { MotorEntity } from "@/domain/motor";
import type { LucideIcon } from "lucide-react";
import {
  CircleAlert,
  Clock,
  PackageCheck,
  PackageMinus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { userCopy } from "@/lib/user-copy";

export const PINNED_FILTER_IDS = [
  "available",
  "reserved",
  "sold",
  "warranty",
  "recent",
  "attention",
] as const;

export type PinnedFilterId = (typeof PINNED_FILTER_IDS)[number];

export type PinnedFilterMeta = {
  id: PinnedFilterId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const PINNED_FILTER_ICONS: Record<PinnedFilterId, LucideIcon> = {
  available: PackageCheck,
  reserved: PackageMinus,
  sold: Sparkles,
  warranty: ShieldCheck,
  recent: Clock,
  attention: CircleAlert,
};

export function getPinnedFilters(): PinnedFilterMeta[] {
  const copy = userCopy.pinnedFilters;
  return PINNED_FILTER_IDS.map((id) => ({
    id,
    label: copy[id].label,
    description: copy[id].description,
    icon: PINNED_FILTER_ICONS[id],
  }));
}

/** Locale-aware pinned filters — prefer getPinnedFilters() at call time. */
export const PINNED_FILTERS: readonly PinnedFilterMeta[] = new Proxy(
  [] as PinnedFilterMeta[],
  {
    get(_target, prop, receiver) {
      const live = getPinnedFilters();
      if (prop === "length") return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const value = Reflect.get(live, prop, receiver);
      return typeof value === "function" ? value.bind(live) : value;
    },
  },
) as readonly PinnedFilterMeta[];

export const STALE_INVENTORY_DAYS = 90;
export const RECENT_INVENTORY_DAYS = 14;

export function pinnedFilterMeta(id: PinnedFilterId): PinnedFilterMeta {
  const filters = getPinnedFilters();
  return filters.find((item) => item.id === id) ?? filters[0]!;
}

export function isPinnedFilterId(value: unknown): value is PinnedFilterId {
  return typeof value === "string" && (PINNED_FILTER_IDS as readonly string[]).includes(value);
}

export function motorMatchesPinnedFilter(motor: MotorEntity, filter: PinnedFilterId, now = new Date()): boolean {
  if (motor.deletedAt) return false;

  switch (filter) {
    case "available":
      return !motor.soldDate && (motor.status ?? "available") === "available";
    case "reserved":
      return (motor.status ?? "available") === "reserved" || Boolean(motor.reservedForWorkOrderId);
    case "sold":
      return Boolean(motor.soldDate) || motor.status === "sold";
    case "warranty":
      return motorHasActiveWarranty(motor, now);
    case "recent":
      return motorIsRecent(motor, now);
    case "attention":
      return motorNeedsAttention(motor, now);
    default:
      return true;
  }
}

export function inventoryItemMatchesPinnedFilter(
  item: InventoryItem,
  filter: PinnedFilterId,
  now = new Date(),
): boolean {
  if (item.status === "archived") return false;

  switch (filter) {
    case "available":
      return item.totalAvailable > 0;
    case "reserved":
      return item.totalReserved > 0;
    case "sold":
      return false;
    case "warranty":
      return false;
    case "recent":
      return itemIsRecent(item, now);
    case "attention":
      return inventoryItemNeedsAttention(item);
    default:
      return true;
  }
}

function motorHasActiveWarranty(motor: MotorEntity, now: Date): boolean {
  if (!motor.soldDate && motor.status !== "sold") return false;
  return Boolean(motor.warrantyId);
}

function motorIsRecent(motor: MotorEntity, now: Date): boolean {
  if (!motor.arrivalDate) return false;
  return differenceInCalendarDays(now, motor.arrivalDate) <= RECENT_INVENTORY_DAYS;
}

function motorNeedsAttention(motor: MotorEntity, now: Date): boolean {
  if (motor.soldDate || motor.deletedAt) return false;
  if (!motor.arrivalDate) return false;
  return differenceInCalendarDays(now, motor.arrivalDate) >= STALE_INVENTORY_DAYS;
}

function itemIsRecent(item: InventoryItem, now: Date): boolean {
  const created = item.createdAt ?? item.updatedAt;
  if (!created) return false;
  return differenceInCalendarDays(now, created) <= RECENT_INVENTORY_DAYS;
}

function inventoryItemNeedsAttention(item: InventoryItem): boolean {
  const threshold = item.lowStockThreshold ?? item.reorderPoint;
  if (threshold == null) return false;
  return item.totalAvailable <= threshold;
}

export function countMotorsByFilter(motors: MotorEntity[], filter: PinnedFilterId): number {
  return motors.filter((motor) => motorMatchesPinnedFilter(motor, filter)).length;
}

export function countInventoryByFilter(items: InventoryItem[], filter: PinnedFilterId): number {
  return items.filter((item) => inventoryItemMatchesPinnedFilter(item, filter)).length;
}

export function pinnedFilterToAvailability(
  filter: PinnedFilterId | undefined,
): "all" | "available" | "sold" {
  if (filter === "sold" || filter === "warranty") return "sold";
  if (filter === "available" || filter === "reserved" || filter === "recent" || filter === "attention") {
    return "available";
  }
  return "all";
}
