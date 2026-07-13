export function scopedItemDocumentId(companyId: string, localId: number): string {
  return `company_${companyId}_item_${localId}`;
}

export function scopedWarehouseDocumentId(companyId: string, localId: number): string {
  return `company_${companyId}_wh_${localId}`;
}

export function stockLevelDocumentId(itemId: string, warehouseId: string): string {
  return `${itemId}__${warehouseId}`;
}

export function locationBalanceDocumentId(itemId: string, locationId: string): string {
  return `${itemId}__${locationId}`;
}

export function normalizeBarcode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
