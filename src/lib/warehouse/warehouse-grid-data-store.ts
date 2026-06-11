import { InventoryItem, InventoryItemStatus, InventoryItemType } from "@/domain/inventory";
import { nextEmptyRowId } from "@/lib/grid/empty-row-id";
import {
  categoryLabelFromPath,
  categoryPathFromLabel,
  normalizeBarcode,
  parseInventoryStatus,
} from "@/lib/warehouse/warehouse-search";

export type WarehouseGridRow =
  | (InventoryItem & {
      rowKind: "saved";
      rowId: string;
    })
  | {
      rowKind: "empty";
      rowId: string;
      draft: WarehouseDraftFields;
    };

export type WarehouseDraftFields = {
  sku: string;
  name: string;
  category: string;
  brandName: string;
  unit: string;
  onHand: string;
  purchasePrice: string;
  sellPrice: string;
  supplierName: string;
  barcode: string;
  warehouseLocation: string;
  lowStockThreshold: string;
  status: InventoryItemStatus;
  type: InventoryItemType;
};

export function createEmptyDraft(): WarehouseDraftFields {
  return {
    sku: "",
    name: "",
    category: "",
    brandName: "",
    unit: "шт",
    onHand: "",
    purchasePrice: "",
    sellPrice: "",
    supplierName: "",
    barcode: "",
    warehouseLocation: "",
    lowStockThreshold: "",
    status: "active",
    type: "consumable",
  };
}

export function createEmptyWarehouseRow(): WarehouseGridRow {
  return {
    rowKind: "empty",
    rowId: nextEmptyRowId(),
    draft: createEmptyDraft(),
  };
}

export function hasWarehouseDraftContent(row: WarehouseGridRow): boolean {
  if (row.rowKind === "saved") return true;
  const { draft } = row;
  return Boolean(
    draft.sku.trim() ||
      draft.name.trim() ||
      draft.category.trim() ||
      draft.brandName.trim() ||
      draft.onHand.trim() ||
      draft.barcode.trim(),
  );
}

export function warehouseRowHasRequiredFields(row: WarehouseGridRow): boolean {
  if (row.rowKind === "empty") {
    return Boolean(row.draft.sku.trim() && row.draft.name.trim());
  }
  return Boolean(row.sku.trim() && row.name.trim());
}

/** Saved row with cleared SKU or name should be removed from inventory (Excel delete row). */
export function savedRowShouldArchive(row: WarehouseGridRow & { rowKind: "saved" }): boolean {
  return !row.sku.trim() || !row.name.trim();
}

export const WAREHOUSE_ROW_ARCHIVED = "archived" as const;
export type WarehouseGridSyncResult = string | typeof WAREHOUSE_ROW_ARCHIVED | undefined;

export function buildWarehouseGridRows(items: InventoryItem[], emptyRows = 30): WarehouseGridRow[] {
  const seenItemIds = new Set<string>();
  const saved: WarehouseGridRow[] = [];
  for (const item of items) {
    if (seenItemIds.has(item.id)) continue;
    seenItemIds.add(item.id);
    saved.push({
      ...item,
      rowKind: "saved",
      rowId: `saved-${item.id}`,
    });
  }
  const next = [...saved];
  for (let index = 0; index < emptyRows; index += 1) {
    next.push(createEmptyWarehouseRow());
  }
  return next;
}

export function growWarehouseRows(rows: WarehouseGridRow[], growBy: number): WarehouseGridRow[] {
  const next = [...rows];
  for (let index = 0; index < growBy; index += 1) {
    next.push(createEmptyWarehouseRow());
  }
  return next;
}

export function reconcileWarehouseRowsWithRemote(
  currentRows: WarehouseGridRow[],
  incomingItems: InventoryItem[],
  dirtyRowIds: Set<string>,
): WarehouseGridRow[] {
  const currentSavedById = new Map(
    currentRows
      .filter((row): row is WarehouseGridRow & { rowKind: "saved" } => row.rowKind === "saved")
      .map((row) => [row.id, row]),
  );

  const saved: WarehouseGridRow[] = [];
  const seenItemIds = new Set<string>();
  for (const item of incomingItems) {
    if (seenItemIds.has(item.id)) continue;
    seenItemIds.add(item.id);
    const rowId = `saved-${item.id}`;
    if (dirtyRowIds.has(rowId)) {
      const preserved = currentSavedById.get(item.id);
      if (preserved) {
        saved.push(preserved);
        continue;
      }
    }
    saved.push({ ...item, rowKind: "saved", rowId });
  }

  const dirtyDraftRows = currentRows.filter(
    (row) => row.rowKind === "empty" && dirtyRowIds.has(row.rowId),
  );
  const targetCount = Math.max(currentRows.length, saved.length + dirtyDraftRows.length, 30);
  const nextRows: WarehouseGridRow[] = [...saved, ...dirtyDraftRows];
  while (nextRows.length < targetCount) {
    nextRows.push(createEmptyWarehouseRow());
  }
  return nextRows;
}

export function applyWarehouseDraftField(
  row: WarehouseGridRow,
  field: keyof WarehouseDraftFields,
  value: string,
): WarehouseGridRow {
  if (row.rowKind !== "empty") return row;
  return {
    ...row,
    draft: {
      ...row.draft,
      [field]: field === "status" ? parseInventoryStatus(value) : value,
    },
  };
}

export function draftFieldForColumn(column: number): keyof WarehouseDraftFields | null {
  switch (column) {
    case 1:
      return "sku";
    case 2:
      return "name";
    case 3:
      return "category";
    case 4:
      return "brandName";
    case 5:
      return "onHand";
    case 8:
      return "purchasePrice";
    case 9:
      return "sellPrice";
    case 10:
      return "supplierName";
    case 11:
      return "barcode";
    case 12:
      return "warehouseLocation";
    case 13:
      return "lowStockThreshold";
    case 14:
      return "status";
    default:
      return null;
  }
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Coerce grid/Firestore numbers so Zod + Firestore never see NaN or negatives. */
export function sanitizeWarehouseNumber(value: number | undefined | null): number | undefined {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

export function parseDraftToUpsert(row: WarehouseGridRow, companyId: string, actorUserId: string) {
  if (row.rowKind === "saved") {
    return {
      companyId,
      localId: row.localId,
      type: row.type,
      sku: row.sku,
      name: row.name,
      brandName: row.brandName,
      supplierName: row.supplierName,
      warehouseLocation: row.warehouseLocation,
      notes: row.notes,
      categoryPath: row.categoryPath,
      unit: row.unit,
      purchasePrice: sanitizeWarehouseNumber(row.purchasePrice),
      sellPrice: sanitizeWarehouseNumber(row.sellPrice),
      lowStockThreshold: sanitizeWarehouseNumber(row.lowStockThreshold),
      barcodes: row.barcodes,
      status: row.status,
      actorUserId,
    };
  }

  const barcode = normalizeBarcode(row.draft.barcode);
  return {
    companyId,
    type: row.draft.type,
    sku: row.draft.sku.trim(),
    name: row.draft.name.trim(),
    brandName: row.draft.brandName.trim() || undefined,
    supplierName: row.draft.supplierName.trim() || undefined,
    warehouseLocation: row.draft.warehouseLocation.trim() || undefined,
    categoryPath: categoryPathFromLabel(row.draft.category),
    unit: row.draft.unit.trim() || "шт",
    purchasePrice: parseOptionalNumber(row.draft.purchasePrice),
    sellPrice: parseOptionalNumber(row.draft.sellPrice),
    lowStockThreshold: parseOptionalNumber(row.draft.lowStockThreshold),
    barcodes: barcode ? [barcode] : [],
    status: row.draft.status,
    actorUserId,
  };
}

export function parseDraftOnHand(row: WarehouseGridRow): number {
  if (row.rowKind === "saved") return row.totalOnHand;
  const parsed = parseOptionalNumber(row.draft.onHand);
  return parsed ?? 0;
}

export function savedRowMetadataChanged(
  baseline: InventoryItem,
  row: WarehouseGridRow & { rowKind: "saved" },
): boolean {
  return (
    baseline.sku !== row.sku ||
    baseline.name !== row.name ||
    categoryLabelFromPath(baseline.categoryPath) !== categoryLabelFromPath(row.categoryPath) ||
    (baseline.brandName ?? "") !== (row.brandName ?? "") ||
    baseline.unit !== row.unit ||
    baseline.purchasePrice !== row.purchasePrice ||
    baseline.sellPrice !== row.sellPrice ||
    (baseline.supplierName ?? "") !== (row.supplierName ?? "") ||
    (baseline.barcodes[0] ?? "") !== (row.barcodes[0] ?? "") ||
    (baseline.warehouseLocation ?? "") !== (row.warehouseLocation ?? "") ||
    baseline.lowStockThreshold !== row.lowStockThreshold ||
    baseline.status !== row.status
  );
}

export function savedRowStockChanged(
  baseline: InventoryItem,
  row: WarehouseGridRow & { rowKind: "saved" },
): boolean {
  return baseline.totalOnHand !== row.totalOnHand;
}

export function warehouseRowMatchesItem(
  row: WarehouseGridRow & { rowKind: "saved" },
  item: InventoryItem,
): boolean {
  return !savedRowMetadataChanged(item, row) && !savedRowStockChanged(item, row);
}

export function buildSavedRowFromCreate(
  row: Extract<WarehouseGridRow, { rowKind: "empty" }>,
  itemId: string,
  companyId: string,
): WarehouseGridRow & { rowKind: "saved" } {
  const barcode = normalizeBarcode(row.draft.barcode);
  const onHand = parseDraftOnHand(row);
  const purchasePrice = parseOptionalNumber(row.draft.purchasePrice);
  const sellPrice = parseOptionalNumber(row.draft.sellPrice);
  const categoryPath = categoryPathFromLabel(row.draft.category);

  return {
    id: itemId,
    companyId,
    type: row.draft.type,
    sku: row.draft.sku.trim(),
    name: row.draft.name.trim(),
    barcodes: barcode ? [barcode] : [],
    brandName: row.draft.brandName.trim() || undefined,
    supplierName: row.draft.supplierName.trim() || undefined,
    warehouseLocation: row.draft.warehouseLocation.trim() || undefined,
    categoryPath,
    unit: row.draft.unit.trim() || "шт",
    purchasePrice,
    averageCost: purchasePrice,
    sellPrice,
    currency: "KZT",
    totalOnHand: onHand,
    totalReserved: 0,
    totalAvailable: onHand,
    stockValue: onHand * (purchasePrice ?? 0),
    status: row.draft.status,
    lowStockThreshold: parseOptionalNumber(row.draft.lowStockThreshold),
    searchTokens: [],
    updatedAt: new Date(),
    rowKind: "saved",
    rowId: `saved-${itemId}`,
  };
}

export function filterWarehouseItems(items: InventoryItem[], search: string): InventoryItem[] {
  const query = search.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => {
    const haystack = [
      item.sku,
      item.name,
      item.brandName,
      item.supplierName,
      item.warehouseLocation,
      item.categoryPath?.join(" "),
      item.barcodes.join(" "),
      ...item.searchTokens,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function isWarehouseRowLowStock(item: InventoryItem): boolean {
  const threshold = item.lowStockThreshold ?? 1;
  return item.status === "active" && item.totalOnHand > 0 && item.totalAvailable <= threshold;
}

export function isWarehouseRowOutOfStock(item: InventoryItem): boolean {
  return item.status === "active" && item.totalOnHand <= 0;
}

export function formatWarehouseUpdatedAt(value: Date | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
