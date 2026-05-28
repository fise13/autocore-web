import {
  categoryPathFromLabel,
  normalizeBarcode,
  normalizeBrandName,
  normalizeSupplierName,
  normalizeWarehouseLocation,
} from "@/lib/warehouse/warehouse-search";

import { cleanBrandSymbol, parseNumeric, parseQuantity } from "./preprocessor";
import { ImportTargetField } from "./types";

const KNOWN_BRANDS = new Map<string, string>([
  ["bmw", "BMW"],
  ["mercedes", "Mercedes-Benz"],
  ["mercedes-benz", "Mercedes-Benz"],
  ["toyota", "Toyota"],
  ["honda", "Honda"],
  ["nissan", "Nissan"],
  ["mazda", "Mazda"],
  ["subaru", "Subaru"],
  ["hyundai", "Hyundai"],
  ["kia", "Kia"],
  ["volkswagen", "Volkswagen"],
  ["vw", "Volkswagen"],
  ["audi", "Audi"],
  ["ford", "Ford"],
  ["chevrolet", "Chevrolet"],
  ["lexus", "Lexus"],
]);

export function normalizeBrand(value: string | undefined): string {
  if (!value?.trim()) return "";
  const compact = cleanBrandSymbol(value).toLowerCase();
  const known = KNOWN_BRANDS.get(compact);
  if (known) return known;
  return normalizeBrandName(value);
}

export function normalizeTitle(value: string | undefined, brand?: string): string {
  if (!value?.trim()) return "";
  let title = value.trim().replace(/\s+/g, " ");
  if (brand) {
    const brandPattern = new RegExp(`^${brand}\\s+`, "i");
    title = title.replace(brandPattern, "");
    title = `${brand} ${title}`.trim();
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function readMappedValue(
  row: Record<string, string>,
  mapping: Record<string, string>,
  field: ImportTargetField,
): string {
  const header = mapping[field];
  if (!header) return "";
  return String(row[header] ?? "").trim();
}

export function normalizeImportRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  aiOverrides?: Partial<{
    name: string;
    brandName: string;
    category: string;
  }>,
) {
  const sku = readMappedValue(row, mapping, "sku");
  const rawName = aiOverrides?.name ?? readMappedValue(row, mapping, "name");
  const rawBrand = aiOverrides?.brandName ?? readMappedValue(row, mapping, "brandName");
  const rawCategory = aiOverrides?.category ?? readMappedValue(row, mapping, "category");
  const brandName = normalizeBrand(rawBrand);
  const name = normalizeTitle(rawName || sku, brandName || undefined);

  return {
    sku,
    name,
    categoryPath: categoryPathFromLabel(rawCategory),
    brandName,
    supplierName: normalizeSupplierName(readMappedValue(row, mapping, "supplierName")),
    barcodes: (() => {
      const barcode = normalizeBarcode(readMappedValue(row, mapping, "barcode"));
      return barcode ? [barcode] : [];
    })(),
    warehouseLocation: normalizeWarehouseLocation(readMappedValue(row, mapping, "warehouseLocation")),
    quantity: parseQuantity(readMappedValue(row, mapping, "quantity")),
    purchasePrice: parseNumeric(readMappedValue(row, mapping, "purchasePrice")),
    sellPrice: parseNumeric(readMappedValue(row, mapping, "sellPrice")),
    unit: readMappedValue(row, mapping, "unit") || "шт",
    lowStockThreshold: parseNumeric(readMappedValue(row, mapping, "lowStockThreshold")),
  };
}
