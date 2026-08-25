import type { CreateDonorInput } from "@/domain/donor";
import type { UpsertInventoryItemInput } from "@/domain/inventory";
import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import { INVENTORY_TAXONOMY, subcategoryLabel } from "@/domain/inventory-taxonomy";
import type { UpsertMotorInput } from "@/domain/motor";
import { readEngineCode } from "@/lib/motors/import/engine-code-shorthand";

import { importDateToDate } from "./date-value";
import { enrichMigrationValuesWithBrand, resolveMigrationBrandName } from "./migration-brand-resolve";
import type { CanonicalField, RecordType } from "./types";

type RowValues = Partial<Record<CanonicalField, string>>;

export const MIGRATION_CATALOG_RECORD_TYPES: RecordType[] = [
  "transmission",
  "transferCase",
  "reducer",
  "turbo",
  "body",
  "optics",
  "suspension",
  "electrical",
];

const SUBCATEGORY_BY_TYPE: Partial<Record<RecordType, InventorySubcategoryId>> = {
  transmission: "gearboxes",
  transferCase: "gearboxes",
  reducer: "gearboxes",
  turbo: "gearboxes",
  body: "body",
  optics: "optics",
  suspension: "suspension",
  electrical: "electrical",
  consumable: "filters",
};

export function isMigrationCatalogRecordType(recordType: RecordType): boolean {
  return MIGRATION_CATALOG_RECORD_TYPES.includes(recordType);
}

export function migrationSubcategoryForRecordType(
  recordType: RecordType,
): InventorySubcategoryId | undefined {
  return SUBCATEGORY_BY_TYPE[recordType];
}

export function migrationCategoryNameForRecordType(recordType: RecordType): string {
  const subcategoryId = migrationSubcategoryForRecordType(recordType);
  return subcategoryId ? subcategoryLabel(subcategoryId) : "Прочее";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function parseQuantity(raw: string | undefined): number {
  if (!raw?.trim()) return 1;
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}

function parsePrice(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function resolveMigrationSku(values: RowValues, rowId: string): string {
  const sku = values.sku?.trim();
  if (sku) return sku;
  const serial = values.serial?.trim();
  if (serial) return serial;
  const name = values.name?.trim();
  if (name) return `MIG-${slug(name) || "item"}-${rowId.replace(":", "-")}`.slice(0, 80);
  return `MIG-${rowId.replace(":", "-")}`;
}

function resolveName(values: RowValues, sku: string): string | null {
  const name = values.name?.trim();
  if (name) return name;
  const serial = values.serial?.trim();
  if (serial) return serial;
  if (values.brand?.trim() && values.model?.trim()) {
    return `${values.brand.trim()} ${values.model.trim()}`;
  }
  return sku || null;
}

function appendPhotoNote(notes: string, photoPath?: string): string {
  if (!photoPath) return notes;
  const tag = `Фото: ${photoPath.split("/").pop() ?? photoPath}`;
  return notes ? `${notes}\n${tag}` : tag;
}

export function buildMotorInputFromMigrationRow(
  values: RowValues,
  companyId: string,
  photoPath?: string,
): UpsertMotorInput | null {
  const enriched = enrichMigrationValuesWithBrand(values, "engine");
  const name = resolveName(enriched, resolveMigrationSku(enriched, "motor"));
  if (!name) return null;

  const serial = enriched.serial?.trim() || enriched.sku?.trim() || name;
  const brandName = resolveMigrationBrandName(enriched, "engine");

  // `engineCode` is the code and nothing else. It used to be set from the
  // display name, so the grid rendered `brand · name` — "SUBARU · Subaru
  // EJ251" — with the manufacturer printed twice in one cell.
  // Left empty when no code can be read. It used to fall back to the display
  // name, which put the manufacturer in the code column — the grid renders
  // `brandName · engineCode`, so the cell read "Subaru · SUBARU".
  const engineCode =
    enriched.model?.trim() || readEngineCode(serial)?.code || readEngineCode(name)?.code || "";

  // Configuration is «КОМПЛЕКТАЦИЯ» — "полная", "без навесного". It used to be
  // built from `model`, which by then held the engine code, so the column just
  // repeated the code that was already two columns to its left.
  const configuration = [enriched.configuration?.trim(), enriched.year?.trim()]
    .filter(Boolean)
    .join(" ");

  // Both dates arrive already normalized to `YYYY-MM-DD`; anything the parser
  // could not read never got that far and is simply absent.
  const arrivalDate = importDateToDate(enriched.arrivalDate?.trim() ?? "");
  const soldDate = importDateToDate(enriched.saleDate?.trim() ?? "");

  return {
    companyId,
    serialCode: serial,
    engineCode: engineCode || undefined,
    brandName: brandName || undefined,
    configuration: configuration || undefined,
    notes: appendPhotoNote(enriched.comment?.trim() ?? "", photoPath),
    quantity: parseQuantity(enriched.quantity),
    transmission: "",
    ...(arrivalDate ? { arrivalDate } : {}),
    ...(soldDate ? { soldDate } : {}),
    // A sale date is what makes a motor sold — `isMotorAvailableForSale` reads
    // exactly this. Importing the date but leaving the status "available"
    // would put engines somebody sold last year back on the shelf.
    ...(soldDate ? { status: "sold" as const } : {}),
  };
}

export function buildInventoryInputFromMigrationRow(
  values: RowValues,
  companyId: string,
  recordType: RecordType,
  rowId: string,
  actorUserId: string,
  photoPath?: string,
): UpsertInventoryItemInput | null {
  const enriched = enrichMigrationValuesWithBrand(values, recordType);
  const sku = resolveMigrationSku(enriched, rowId);
  const name = resolveName(enriched, sku);
  if (!name) return null;

  const subcategoryId = SUBCATEGORY_BY_TYPE[recordType];
  const taxonomy = subcategoryId
    ? INVENTORY_TAXONOMY.find((item) => item.id === subcategoryId)
    : undefined;
  const inventoryGroup: InventoryGroupId =
    recordType === "consumable" ? "consumables" : (taxonomy?.groupId ?? "parts");

  const notes = appendPhotoNote(enriched.comment?.trim() ?? "", photoPath);
  const location = enriched.location?.trim() || enriched.warehouse?.trim() || undefined;
  const brandName = resolveMigrationBrandName(enriched, recordType);

  return {
    companyId,
    sku,
    name,
    brandName: brandName || undefined,
    warehouseLocation: location,
    inventoryGroup,
    subcategoryId: recordType === "consumable" ? subcategoryId : undefined,
    unit: "pcs",
    purchasePrice: parsePrice(enriched.price),
    sellPrice: parsePrice(enriched.price),
    currency: enriched.currency?.trim() || "USD",
    notes: notes || undefined,
    actorUserId,
    type: recordType === "consumable" ? "consumable" : "generic",
  };
}

/** Map a migration row into the default specific-catalog column layout (КПП, кузов, …). */
export function buildSpecificRecordDataFromMigrationRow(
  values: RowValues,
  recordType: RecordType,
  photoPath?: string,
): Record<string, string> | null {
  const enriched = enrichMigrationValuesWithBrand(values, recordType);
  const serial = enriched.serial?.trim() || enriched.sku?.trim() || enriched.name?.trim();
  if (!serial) return null;

  const brand = resolveMigrationBrandName(enriched, recordType);
  const configuration =
    enriched.configuration?.trim() ||
    [brand, enriched.model?.trim()].filter(Boolean).join(" ");
  const notes = appendPhotoNote(enriched.comment?.trim() ?? "", photoPath);

  return {
    "Номер двигателя": serial,
    "Комплектация": configuration,
    "Особые отметки": notes,
    "Кол-во": String(parseQuantity(enriched.quantity)),
    "Коробка": "",
    "Дата прихода": "",
    "Дата продажи": "",
  };
}

export function buildDonorInputFromMigrationRow(
  values: RowValues,
  companyId: string,
  actorUserId: string,
  rowId?: string,
): CreateDonorInput | null {
  const make = values.brand?.trim() || values.name?.trim();
  const model = values.model?.trim() || values.name?.trim();
  if (!make && !model && !values.vin?.trim()) return null;
  const yearRaw = values.year?.trim();
  const year = yearRaw ? Number(yearRaw) : undefined;
  const priceRaw = values.price?.replace(/\s/g, "").replace(",", ".") ?? "";
  const purchasePrice = Number(priceRaw);
  return {
    id: rowId,
    companyId,
    createdByUserId: actorUserId,
    vin: values.vin?.trim() ?? "",
    make: make || "—",
    model: model || "—",
    year: Number.isFinite(year) ? year : undefined,
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
    currency: values.currency?.trim() || "KZT",
    source: values.comment?.trim(),
    yardLocation: values.location?.trim() || values.warehouse?.trim(),
    notes: values.comment?.trim(),
  };
}
