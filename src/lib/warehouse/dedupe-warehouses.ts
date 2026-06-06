import { Warehouse } from "@/domain/warehouse";

function warehouseGroupKey(warehouse: Warehouse): string {
  const code = warehouse.code?.trim().toLowerCase();
  if (code) return `code:${code}`;
  return `name:${warehouse.name.trim().toLowerCase()}`;
}

function pickPreferredWarehouse(candidates: Warehouse[], preferredId?: string): Warehouse {
  if (preferredId) {
    const match = candidates.find((warehouse) => warehouse.id === preferredId);
    if (match) return match;
  }

  return [...candidates].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return Number(b.isDefault) - Number(a.isDefault);
    const aTime = a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  })[0];
}

/** Hides duplicate warehouses created by race conditions (same name/code). */
export function dedupeWarehousesForDisplay(
  warehouses: Warehouse[],
  preferredDefaultId?: string,
): Warehouse[] {
  const groups = new Map<string, Warehouse[]>();

  for (const warehouse of warehouses) {
    const key = warehouseGroupKey(warehouse);
    const group = groups.get(key) ?? [];
    group.push(warehouse);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => pickPreferredWarehouse(group, preferredDefaultId));
}
