import type { UpsertInventoryItemInput } from "@/domain/inventory";
import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import { INVENTORY_TAXONOMY, subcategoryLabel } from "@/domain/inventory-taxonomy";
import type { UpsertMotorInput } from "@/domain/motor";

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
  const configuration = [enriched.model?.trim(), enriched.year?.trim()].filter(Boolean).join(" ");
  const brandName = resolveMigrationBrandName(enriched, "engine");

  return {
    companyId,
    serialCode: serial,
    engineCode: enriched.name?.trim() || name,
    brandName: brandName || undefined,
    configuration: configuration || undefined,
    notes: appendPhotoNote(enriched.comment?.trim() ?? "", photoPath),
    quantity: parseQuantity(enriched.quantity),
    transmission: "",
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
    unit: "шт",
    purchasePrice: parsePrice(enriched.price),
    sellPrice: parsePrice(enriched.price),
    currency: enriched.currency?.trim() || "KZT",
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
  const model = enriched.model?.trim();
  const configuration = [brand, model].filter(Boolean).join(" ") || model || brand || "";
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
