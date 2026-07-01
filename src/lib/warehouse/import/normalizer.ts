import {
  resolveConsumableSubcategoryFromText,
} from "@/lib/warehouse/inventory-taxonomy-normalize";
import { subcategoryLabel } from "@/domain/inventory-taxonomy";
import {
  categoryPathFromLabel,
  normalizeBarcode,
  normalizeBrandName,
  normalizeSupplierName,
  normalizeWarehouseLocation,
} from "@/lib/warehouse/warehouse-search";

import { cleanBrandSymbol, parseNumeric, parseQuantity } from "./preprocessor";
import { ImportTargetField } from "./types";
import { PresetEnrichment } from "./format-presets";
import { resolveImportSku } from "./sku-resolver";

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

export function normalizeUnit(value: string | undefined): string {
  if (!value?.trim()) return "шт";
  const normalized = value.trim().toLowerCase();
  if (normalized === "штука" || normalized === "шт." || normalized === "шт") return "шт";
  if (normalized === "литр" || normalized === "л") return "л";
  if (normalized === "килограмм" || normalized === "кг") return "кг";
  if (normalized === "упаковка" || normalized === "уп") return "уп";
  return value.trim();
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
    sku: string;
    quantity: number;
    purchasePrice: number;
    sellPrice: number;
    barcode: string;
  }>,
  presetEnrichment?: PresetEnrichment,
) {
  const rawName = aiOverrides?.name ?? readMappedValue(row, mapping, "name");
  const rawBrand = aiOverrides?.brandName ?? readMappedValue(row, mapping, "brandName");
  const rawCategory = aiOverrides?.category ?? readMappedValue(row, mapping, "category");
  const brandName = normalizeBrand(rawBrand);
  const sku = aiOverrides?.sku?.trim() || resolveImportSku(row, mapping, presetEnrichment);
  const name = normalizeTitle(rawName || sku, brandName || undefined);

  const barcodes = (() => {
    const fromAi = aiOverrides?.barcode ? normalizeBarcode(aiOverrides.barcode) : "";
    if (fromAi) return [fromAi];
    const candidates = [
      readMappedValue(row, mapping, "barcode"),
      ...(presetEnrichment?.barcodeFallbackHeaders ?? []).map((header) => row[header] ?? ""),
      presetEnrichment?.barcodeFallbackHeader ? row[presetEnrichment.barcodeFallbackHeader] ?? "" : "",
    ];
    for (const candidate of candidates) {
      const barcode = normalizeBarcode(candidate);
      if (barcode) return [barcode];
    }
    const skuBarcode = normalizeBarcode(sku);
    if (skuBarcode && skuBarcode.length >= 8) return [skuBarcode];
    return [];
  })();

  const quantity = (() => {
    if (aiOverrides?.quantity != null && Number.isFinite(aiOverrides.quantity)) {
      return Math.max(0, aiOverrides.quantity);
    }
    if (presetEnrichment?.quantityIncomingHeader || presetEnrichment?.quantityOutgoingHeader) {
      const incoming = presetEnrichment.quantityIncomingHeader
        ? parseQuantity(row[presetEnrichment.quantityIncomingHeader] ?? "")
        : 0;
      const outgoing = presetEnrichment.quantityOutgoingHeader
        ? parseQuantity(row[presetEnrichment.quantityOutgoingHeader] ?? "")
        : 0;
      return Math.max(0, incoming - outgoing);
    }
    return parseQuantity(readMappedValue(row, mapping, "quantity"));
  })();

  const categoryPath = categoryPathFromLabel(rawCategory);
  const resolvedSubcategory = resolveConsumableSubcategoryFromText(rawCategory, name);

  return {
    sku,
    name,
    ...(categoryPath ? { categoryPath } : {}),
    ...(resolvedSubcategory
      ? {
          subcategoryId: resolvedSubcategory,
          inventoryGroup: "consumables" as const,
          categoryPath: categoryPathFromLabel(subcategoryLabel(resolvedSubcategory)),
        }
      : {}),
    brandName,
    supplierName: normalizeSupplierName(readMappedValue(row, mapping, "supplierName")),
    barcodes,
    warehouseLocation: normalizeWarehouseLocation(readMappedValue(row, mapping, "warehouseLocation")),
    quantity,
    ...(aiOverrides?.purchasePrice != null
      ? { purchasePrice: aiOverrides.purchasePrice }
      : parseNumeric(readMappedValue(row, mapping, "purchasePrice")) != null
        ? { purchasePrice: parseNumeric(readMappedValue(row, mapping, "purchasePrice")) }
        : {}),
    ...(aiOverrides?.sellPrice != null
      ? { sellPrice: aiOverrides.sellPrice }
      : parseNumeric(readMappedValue(row, mapping, "sellPrice")) != null
        ? { sellPrice: parseNumeric(readMappedValue(row, mapping, "sellPrice")) }
        : {}),
    unit: normalizeUnit(readMappedValue(row, mapping, "unit")),
    ...(parseNumeric(readMappedValue(row, mapping, "lowStockThreshold")) != null
      ? { lowStockThreshold: parseNumeric(readMappedValue(row, mapping, "lowStockThreshold")) }
      : {}),
  };
}
