import { coerceToDate } from '@/lib/firestore-timestamp';
import { joinSearchFields, matchesSearchQuery } from '@/lib/search/match-query';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';

export const STALE_MOTOR_DAYS = 90;

export function warehouseLowStockThreshold(item: InventoryItem): number {
  return item.lowStockThreshold ?? 1;
}

/** Active warehouse item at or below its reorder threshold. */
export function isWarehouseLowStock(item: InventoryItem): boolean {
  if (item.status !== 'active') return false;
  return item.totalAvailable <= warehouseLowStockThreshold(item);
}

function calendarDaysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Motors are unit-tracked — stale on lot, not quantity-based. */
export function isMotorStale(motor: MotorEntity, now = new Date()): boolean {
  if (coerceToDate(motor.soldDate) || coerceToDate(motor.deletedAt)) return false;
  if (motor.status === 'sold' || motor.status === 'installed') return false;
  const arrivalDate = coerceToDate(motor.arrivalDate);
  if (!arrivalDate) return false;
  return calendarDaysBetween(arrivalDate, now) >= STALE_MOTOR_DAYS;
}

export function motorMatchesSearchQuery(motor: MotorEntity, query: string): boolean {
  return matchesSearchQuery(
    joinSearchFields(
      motor.serialCode,
      motor.brandName,
      motor.engineCode,
      motor.configuration,
      motor.notes,
      motor.transmission,
    ),
    query,
  );
}
