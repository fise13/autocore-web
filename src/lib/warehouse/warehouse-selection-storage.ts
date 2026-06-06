const STORAGE_PREFIX = "autocore-selected-warehouse";

export function readSelectedWarehouseId(companyId: string): string | null {
  if (typeof window === "undefined" || !companyId) return null;
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}:${companyId}`);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function writeSelectedWarehouseId(companyId: string, warehouseId: string | null) {
  if (typeof window === "undefined" || !companyId) return;
  try {
    const key = `${STORAGE_PREFIX}:${companyId}`;
    if (!warehouseId) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, warehouseId);
  } catch {
    // ignore quota / private mode
  }
}
