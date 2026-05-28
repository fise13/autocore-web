import { InventoryImportRow } from "@/domain/inventory-import";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";

import {
  buildImportPreview,
  suggestColumnMapping,
} from "@/lib/warehouse/import-rules-engine";
import { ensureDefaultWarehouseUseCase } from "./ensure-default-warehouse";
import { receiveStockUseCase } from "./receive-stock";
import { upsertInventoryItemUseCase } from "./upsert-inventory-item";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

export async function createImportJobUseCase(
  importRepository: InventoryImportRepository,
  itemRepository: InventoryItemRepository,
  params: {
    companyId: string;
    sourceFileName?: string;
    headers: string[];
    rows: Record<string, string>[];
    columnMapping?: Record<string, string>;
    createdByUserId: string;
  },
) {
  const mapping = params.columnMapping ?? suggestColumnMapping(params.headers);
  const preview = await buildImportPreview(params.companyId, params.rows, mapping, itemRepository);
  const jobId = await importRepository.createJob({
    companyId: params.companyId,
    sourceFileName: params.sourceFileName,
    columnMapping: mapping,
    rows: preview.rows,
    stats: preview.stats,
    createdByUserId: params.createdByUserId,
  });
  return { jobId, ...preview };
}

export async function applyImportJobUseCase(
  importRepository: InventoryImportRepository,
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    jobId: string;
    rows: InventoryImportRow[];
    actorUserId: string;
    defaultWarehouseId?: string;
  },
) {
  await importRepository.updateStatus(params.jobId, "applying");
  await ensureDefaultWarehouseUseCase(warehouseRepository, params.companyId, params.actorUserId);
  const warehouse = params.defaultWarehouseId
    ? { id: params.defaultWarehouseId }
    : await warehouseRepository.getDefault(params.companyId);
  if (!warehouse) throw new Error("Склад не найден");

  let applied = 0;
  for (const row of params.rows.filter((item) => item.selected && item.errors.length === 0)) {
    const normalized = row.normalized;
    const sku = String(normalized.sku ?? "").trim();
    const name = String(normalized.name ?? sku).trim();
    if (!sku || !name) continue;

    let itemId = row.duplicateOfItemId;
    if (!itemId) {
      itemId = await upsertInventoryItemUseCase(itemRepository, {
        companyId: params.companyId,
        sku,
        name,
        brandName: normalized.brandName ? String(normalized.brandName) : undefined,
        supplierName: normalized.supplierName ? String(normalized.supplierName) : undefined,
        warehouseLocation: normalized.warehouseLocation ? String(normalized.warehouseLocation) : undefined,
        categoryPath: Array.isArray(normalized.categoryPath)
          ? normalized.categoryPath.map(String)
          : undefined,
        barcodes: Array.isArray(normalized.barcodes) ? normalized.barcodes.map(String) : undefined,
        unit: normalized.unit ? String(normalized.unit) : "шт",
        purchasePrice:
          normalized.purchasePrice != null ? Number(normalized.purchasePrice) : undefined,
        sellPrice: normalized.sellPrice != null ? Number(normalized.sellPrice) : undefined,
        lowStockThreshold:
          normalized.lowStockThreshold != null ? Number(normalized.lowStockThreshold) : undefined,
        actorUserId: params.actorUserId,
      });
    }

    const qty = Number(normalized.quantity ?? 0);
    if (qty > 0) {
      await receiveStockUseCase(
        itemRepository,
        stockLevelRepository,
        movementRepository,
        warehouseRepository,
        financialRepository,
        {
          companyId: params.companyId,
          itemId,
          warehouseId: warehouse.id,
          quantity: qty,
          unitCost: normalized.purchasePrice != null ? Number(normalized.purchasePrice) : undefined,
          actorUserId: params.actorUserId,
          reason: "Импорт Excel",
        },
      );
    }
    applied += 1;
  }

  await importRepository.markCompleted(params.jobId, params.companyId, params.actorUserId);
  return { applied };
}
