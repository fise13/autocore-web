import { InventoryImportRow } from "@/domain/inventory-import";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";

import { runImportPreviewPipeline } from "@/lib/warehouse/import/pipeline";
import { ImportApplyOptions, ImportApplyProgress } from "@/lib/warehouse/import/types";
import { ensureDefaultWarehouseUseCase } from "./ensure-default-warehouse";
import { receiveStockUseCase } from "./receive-stock";
import { upsertInventoryItemUseCase } from "./upsert-inventory-item";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { InventoryItem } from "@/domain/inventory";

const APPLY_CHUNK_SIZE = 25;

export async function createImportJobUseCase(
  importRepository: InventoryImportRepository,
  itemRepository: InventoryItemRepository,
  params: {
    companyId: string;
    sourceFileName?: string;
    file: File;
    selectedSheetName?: string;
    manualColumnMapping?: Record<string, string>;
    useAi?: boolean;
    existingItems?: InventoryItem[];
    createdByUserId: string;
    onProgress?: Parameters<typeof runImportPreviewPipeline>[1]["onProgress"];
  },
) {
  const preview = await runImportPreviewPipeline(itemRepository, {
    companyId: params.companyId,
    file: params.file,
    selectedSheetName: params.selectedSheetName,
    manualColumnMapping: params.manualColumnMapping,
    useAi: params.useAi,
    existingItems: params.existingItems,
    onProgress: params.onProgress,
  });

  const jobId = await importRepository.createJob({
    companyId: params.companyId,
    sourceFileName: params.sourceFileName ?? params.file.name,
    columnMapping: preview.columnMapping.mapping,
    columnMappingSource: preview.columnMapping.source,
    rows: preview.rows,
    stats: preview.stats,
    createdByUserId: params.createdByUserId,
  });

  await importRepository.appendAuditEvent(jobId, {
    actor: params.createdByUserId,
    action: "import_started",
    metadata: {
      fileName: params.sourceFileName ?? params.file.name,
      totalRows: preview.stats.total,
    },
  });

  if (preview.columnMapping.source === "ai") {
    await importRepository.appendAuditEvent(jobId, {
      actor: params.createdByUserId,
      action: "import_ai_mapped",
      metadata: { reasoning: preview.columnMapping.reasoning ?? "" },
    });
  }

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
    sourceFileName?: string;
    applyOptions?: ImportApplyOptions;
    onProgress?: (progress: ImportApplyProgress) => void;
    shouldCancel?: () => boolean;
  },
) {
  await importRepository.updateStatus(params.jobId, "applying");
  await ensureDefaultWarehouseUseCase(warehouseRepository, params.companyId, params.actorUserId);
  const warehouse = params.defaultWarehouseId
    ? { id: params.defaultWarehouseId }
    : await warehouseRepository.getDefault(params.companyId);
  if (!warehouse) throw new Error("Склад не найден");

  const selectedRows = params.rows.filter((item) => item.selected && item.errors.length === 0);
  const total = selectedRows.length;
  let applied = 0;
  let failed = 0;
  const rollbackMovementIds: string[] = [];
  const applyOptions = params.applyOptions ?? {
    createExpense: false,
    updateExistingMetadata: true,
    warehouseId: warehouse.id,
  };

  for (let offset = 0; offset < selectedRows.length; offset += APPLY_CHUNK_SIZE) {
    if (params.shouldCancel?.()) break;
    const chunk = selectedRows.slice(offset, offset + APPLY_CHUNK_SIZE);

    for (const row of chunk) {
      if (params.shouldCancel?.()) break;
      try {
        const normalized = row.normalized;
        const sku = String(normalized.sku ?? "").trim();
        const name = String(normalized.name ?? sku).trim();
        if (!sku || !name) continue;

        const shouldUpdateExisting =
          Boolean(row.duplicateOfItemId) && applyOptions.updateExistingMetadata !== false;
        let itemId = row.duplicateOfItemId;

        if (!itemId || shouldUpdateExisting) {
          itemId = await upsertInventoryItemUseCase(
            itemRepository,
            {
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
            },
            itemId,
          );
        }

        const qty = Number(normalized.quantity ?? 0);
        if (qty > 0 && itemId) {
          const movementId = await receiveStockUseCase(
            itemRepository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            financialRepository,
            {
              companyId: params.companyId,
              itemId,
              warehouseId: applyOptions.warehouseId ?? warehouse.id,
              quantity: qty,
              unitCost: normalized.purchasePrice != null ? Number(normalized.purchasePrice) : undefined,
              actorUserId: params.actorUserId,
              reason: `Импорт: ${params.sourceFileName ?? "файл"}`,
              createExpense: applyOptions.createExpense,
              referenceType: "import",
              referenceId: params.jobId,
              idempotencyKey: `import:${params.jobId}:${row.rowIndex}`,
            },
          );
          rollbackMovementIds.push(movementId);
        }
        applied += 1;
      } catch {
        failed += 1;
      }
    }

    params.onProgress?.({
      applied,
      failed,
      total,
      percent: total === 0 ? 100 : Math.round(((applied + failed) / total) * 100),
      cancelled: Boolean(params.shouldCancel?.()),
    });
    await importRepository.updateProgress(params.jobId, {
      phase: "applying",
      current: applied + failed,
      total,
      percent: total === 0 ? 100 : Math.round(((applied + failed) / total) * 100),
      message: `Импортировано ${applied} из ${total}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (params.shouldCancel?.()) {
    await importRepository.updateStatus(params.jobId, "failed", "Импорт отменён пользователем");
    return { applied, failed, cancelled: true };
  }

  await importRepository.markCompleted(params.jobId, params.companyId, params.actorUserId, {
    applied,
    failed,
    rollbackMovementIds,
  });
  return { applied, failed, cancelled: false };
}
