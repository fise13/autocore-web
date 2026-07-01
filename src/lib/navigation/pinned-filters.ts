import { differenceInCalendarDays } from "date-fns";

import type { InventoryItem } from "@/domain/inventory";
import type { MotorEntity } from "@/domain/motor";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Clock,
  PackageCheck,
  PackageMinus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

export const PINNED_FILTERS: readonly PinnedFilterMeta[] = [
  {
    id: "available",
    label: "В наличии",
    description: "Доступно для продажи",
    icon: PackageCheck,
  },
  {
    id: "reserved",
    label: "Забронировано",
    description: "Зарезервировано под заказ-наряд",
    icon: PackageMinus,
  },
  {
    id: "sold",
    label: "Продано",
    description: "Проданные позиции",
    icon: Sparkles,
  },
  {
    id: "warranty",
    label: "На гарантии",
    description: "Продано с активной гарантией",
    icon: ShieldCheck,
  },
  {
    id: "recent",
    label: "Недавно добавлено",
    description: "Поступило за последние 14 дней",
    icon: Clock,
  },
  {
    id: "attention",
    label: "Требует внимания",
    description: "Долго на складе или мало остатков",
    icon: AlertCircle,
  },
] as const;

export const STALE_INVENTORY_DAYS = 90;
export const RECENT_INVENTORY_DAYS = 14;

export function pinnedFilterMeta(id: PinnedFilterId): PinnedFilterMeta {
  return PINNED_FILTERS.find((item) => item.id === id) ?? PINNED_FILTERS[0];
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
