import { InventoryItemStatus, UpsertInventoryItemInput } from "@/domain/inventory";

function token(value: string | undefined | null): string[] {
  if (!value?.trim()) return [];
  return value
    .trim()
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter(Boolean);
}

export function buildInventorySearchTokens(input: UpsertInventoryItemInput): string[] {
  const tokens = new Set<string>();
  for (const part of [
    input.sku,
    input.name,
    input.description,
    input.brandName,
    input.supplierName,
    input.warehouseLocation,
    input.notes,
    ...(input.categoryPath ?? []),
    ...(input.barcodes ?? []),
  ]) {
    for (const item of token(part)) {
      tokens.add(item);
    }
  }
  return [...tokens];
}

export function normalizeBrandName(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeSupplierName(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBarcode(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s+/g, "");
}

export function normalizeWarehouseLocation(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function categoryPathFromLabel(value: string | undefined): string[] | undefined {
  if (!value?.trim()) return undefined;
  return value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function categoryLabelFromPath(path: string[] | undefined): string {
  if (!path?.length) return "";
  return path.join(" / ");
}

export function parseInventoryStatus(value: string | undefined): InventoryItemStatus {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "discontinued" || normalized === "снят") return "discontinued";
  if (normalized === "archived" || normalized === "архив") return "archived";
  return "active";
}
