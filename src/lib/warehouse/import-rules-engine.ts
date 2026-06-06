import { InventoryImportRow } from "@/domain/inventory-import";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import {
  categoryPathFromLabel,
  normalizeBarcode,
  normalizeBrandName,
  normalizeSupplierName,
  normalizeWarehouseLocation,
} from "@/lib/warehouse/warehouse-search";

const HEADER_ALIASES: Record<string, string[]> = {
  sku: ["sku", "артикул", "article", "код номенклатуры", "оригинальный номер"],
  name: ["name", "название", "наименование", "товар"],
  category: ["category", "категория", "группа"],
  brandName: ["brand", "бренд", "марка", "производитель"],
  supplierName: ["supplier", "поставщик", "vendor"],
  barcode: ["barcode", "штрихкод", "ean", "upc"],
  warehouseLocation: ["location", "место", "ячейка", "полка", "склад"],
  quantity: ["qty", "quantity", "кол-во", "количество", "остаток", "приход"],
  purchasePrice: ["purchase", "закупка", "цена закупки", "cost", "цена прихода"],
  sellPrice: ["sell", "продажа", "цена продажи", "price", "цена: цена продажи"],
  unit: ["unit", "ед", "единица", "единица измерения"],
  lowStockThreshold: ["minimum", "мин. запас", "минимальный остаток", "порог"],
};

export type ImportDiffAction = "create" | "update" | "skip";

export type InventoryImportDiffRow = InventoryImportRow & {
  action: ImportDiffAction;
  summary: string;
};

export function suggestColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => header.includes(alias)),
    );
    if (index >= 0) {
      mapping[field] = headers[index];
    }
  }

  return mapping;
}

function readMapped(row: Record<string, string>, mapping: Record<string, string>, field: string) {
  const header = mapping[field];
  if (!header) return "";
  return String(row[header] ?? "").trim();
}

export async function buildImportPreview(
  companyId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  itemRepository: InventoryItemRepository,
) {
  const previewRows: InventoryImportRow[] = [];
  let valid = 0;
  let duplicates = 0;
  let errors = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index];
    const sku = readMapped(raw, mapping, "sku");
    const name = readMapped(raw, mapping, "name");
    const category = readMapped(raw, mapping, "category");
    const brandName = normalizeBrandName(readMapped(raw, mapping, "brandName"));
    const supplierName = normalizeSupplierName(readMapped(raw, mapping, "supplierName"));
    const barcode = normalizeBarcode(readMapped(raw, mapping, "barcode"));
    const warehouseLocation = normalizeWarehouseLocation(readMapped(raw, mapping, "warehouseLocation"));
    const quantityRaw = readMapped(raw, mapping, "quantity");
    const purchasePriceRaw = readMapped(raw, mapping, "purchasePrice");
    const sellPriceRaw = readMapped(raw, mapping, "sellPrice");
    const unit = readMapped(raw, mapping, "unit") || "шт";
    const lowStockRaw = readMapped(raw, mapping, "lowStockThreshold");

    const rowErrors: string[] = [];
    if (!sku) rowErrors.push("SKU обязателен");
    if (!name && !sku) rowErrors.push("Название обязательно");

    const quantity = quantityRaw ? Number(quantityRaw.replace(",", ".")) : 0;
    if (quantityRaw && !Number.isFinite(quantity)) {
      rowErrors.push("Некорректное количество");
    }

    let duplicateOfItemId: string | undefined;
    if (sku) {
      const existing = await itemRepository.findBySku(companyId, sku);
      if (existing) {
        duplicateOfItemId = existing.id;
        duplicates += 1;
      }
    }

    const normalized = {
      sku,
      name: name || sku,
      categoryPath: categoryPathFromLabel(category),
      brandName,
      supplierName,
      barcodes: barcode ? [barcode] : [],
      warehouseLocation,
      quantity,
      purchasePrice: purchasePriceRaw ? Number(purchasePriceRaw.replace(",", ".")) : undefined,
      sellPrice: sellPriceRaw ? Number(sellPriceRaw.replace(",", ".")) : undefined,
      unit,
      lowStockThreshold: lowStockRaw ? Number(lowStockRaw.replace(",", ".")) : undefined,
    };

    const confidence =
      rowErrors.length === 0 ? (duplicateOfItemId ? 0.7 : 0.95) : Math.max(0.2, 0.5 - rowErrors.length * 0.1);

    if (rowErrors.length > 0) errors += 1;
    else valid += 1;

    previewRows.push({
      rowIndex: index + 1,
      raw,
      normalized,
      confidence,
      errors: rowErrors,
      duplicateOfItemId,
      selected: rowErrors.length === 0,
    });
  }

  return {
    rows: buildImportDiffRows(previewRows),
    stats: {
      total: previewRows.length,
      valid,
      duplicates,
      errors,
    },
  };
}

export function buildImportDiffRows(rows: InventoryImportRow[]): InventoryImportDiffRow[] {
  return rows.map((row) => {
    if (row.errors.length > 0 || !row.selected) {
      return {
        ...row,
        action: "skip",
        summary: row.errors[0] ?? "Строка выключена из импорта",
      };
    }

    if (row.duplicateOfItemId) {
      return {
        ...row,
        action: "update",
        summary: "Обновит существующую позицию после подтверждения",
      };
    }

    return {
      ...row,
      action: "create",
      summary: "Создаст новую позицию после подтверждения",
    };
  });
}

export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split("\t").length > 1 ? lines[0].split("\t") : lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = (cells[index] ?? "").trim();
    });
    return row;
  });

  return { headers: headers.map((header) => header.trim()), rows };
}
