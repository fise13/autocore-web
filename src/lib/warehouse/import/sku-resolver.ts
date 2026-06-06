import { normalizeBarcode } from "@/lib/warehouse/warehouse-search";

import { readMappedValue } from "./normalizer";
import { PresetEnrichment } from "./format-presets";

function cleanSkuCandidate(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isAlphanumericPartNumber(value: string): boolean {
  return /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

function isEanLike(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 14;
}

function isShortCatalogCode(value: string): boolean {
  return /^\d{4,7}$/.test(value.trim());
}

function firstNonEmpty(values: string[]): string {
  return values.map(cleanSkuCandidate).find(Boolean) ?? "";
}

export function resolveImportSku(
  row: Record<string, string>,
  mapping: Record<string, string>,
  enrichment?: PresetEnrichment,
): string {
  const primary = cleanSkuCandidate(readMappedValue(row, mapping, "sku"));
  const fallbackHeaders = enrichment?.skuFallbackHeaders ?? [];
  const barcodeHeaders = enrichment?.barcodeFallbackHeaders ?? [];

  const originalNumber = firstNonEmpty([
    ...fallbackHeaders
      .filter((header) => header.toLowerCase().includes("оригин"))
      .map((header) => row[header] ?? ""),
  ]);
  const manufacturerNumber = firstNonEmpty([
    ...fallbackHeaders
      .filter((header) => header.toLowerCase().includes("производ"))
      .map((header) => row[header] ?? ""),
  ]);
  const barcodeValues = [
    readMappedValue(row, mapping, "barcode"),
    ...barcodeHeaders.map((header) => row[header] ?? ""),
    ...fallbackHeaders
      .filter((header) => header.toLowerCase().includes("штрих"))
      .map((header) => row[header] ?? ""),
  ].map((value) => normalizeBarcode(value)).filter(Boolean);

  const name = cleanSkuCandidate(readMappedValue(row, mapping, "name"));
  const internalId = enrichment?.internalIdHeader
    ? cleanSkuCandidate(row[enrichment.internalIdHeader] ?? "")
    : "";

  if (primary && !isShortCatalogCode(primary)) return primary;
  if (primary && isShortCatalogCode(primary)) {
    if (originalNumber) return originalNumber;
    if (manufacturerNumber) return manufacturerNumber;
    if (barcodeValues[0]) return barcodeValues[0];
    return primary;
  }

  if (originalNumber && isAlphanumericPartNumber(originalNumber)) return originalNumber;
  if (manufacturerNumber && isAlphanumericPartNumber(manufacturerNumber)) return manufacturerNumber;
  if (originalNumber) return originalNumber;
  if (manufacturerNumber) return manufacturerNumber;

  const ean = barcodeValues.find((value) => isEanLike(value));
  if (ean) return ean;
  if (barcodeValues[0]) return barcodeValues[0];

  if (name) return name;
  if (internalId) return internalId;

  return primary;
}

export function disambiguateDuplicateSkus(
  rows: Array<{ rowIndex: number; raw: Record<string, string>; normalized: Record<string, unknown> }>,
  internalIdHeader?: string,
): typeof rows {
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const baseSku = String(row.normalized.sku ?? "").trim();
    if (!baseSku) return row;

    const key = baseSku.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);

    if (count === 0) return row;

    const internalId = internalIdHeader ? String(row.raw[internalIdHeader] ?? "").trim() : "";
    const nextSku = internalId ? `${baseSku}-${internalId}` : `${baseSku}-${row.rowIndex}`;

    return {
      ...row,
      normalized: {
        ...row.normalized,
        sku: nextSku,
      },
    };
  });
}

export function buildSkuFallbackHeaders(headers: string[]): string[] {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const pick = (...candidates: string[]) => {
    for (const candidate of candidates) {
      const index = normalized.findIndex(
        (header) => header === candidate || header.includes(candidate),
      );
      if (index >= 0) return headers[index];
    }
    return undefined;
  };

  return [
    pick("оригинальный номер"),
    pick("номер производителя"),
    pick("штрихкод"),
    pick("наименование"),
  ].filter(Boolean) as string[];
}

export function findInternalIdHeader(headers: string[]): string | undefined {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const index = normalized.findIndex((header) => header === "идентификатор");
  return index >= 0 ? headers[index] : undefined;
}
