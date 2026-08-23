import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import {
  parseDraftOnHand,
  parseDraftToUpsert,
  savedRowMetadataChanged,
  savedRowShouldArchive,
  savedRowStockChanged,
  WAREHOUSE_ROW_ARCHIVED,
  WarehouseGridRow,
  WarehouseGridSyncResult,
} from "@/lib/warehouse/warehouse-grid-data-store";

import { adjustStockUseCase } from "./adjust-stock";
import { receiveStockUseCase } from "./receive-stock";
import { syncItemLocationAssignmentUseCase } from "./relocate-stock";
import { upsertInventoryItemUseCase } from "./upsert-inventory-item";

async function resolveWarehouseId(
  warehouseRepository: WarehouseRepository,
  companyId: string,
  warehouseId?: string,
): Promise<string> {
  if (warehouseId) return warehouseId;
  const fallback = await warehouseRepository.getDefault(companyId);
  if (!fallback) {
    throw new Error("Warehouse not found");
  }
  return fallback.id;
}

/**
 * Align on-hand for a warehouse. Always ensures a stock-level doc exists so the
 * item appears in `projectItemsForWarehouse` (otherwise sync "succeeds" but the
 * grid stays at 0/0).
 */
async function syncWarehouseOnHand(params: {
  itemRepository: InventoryItemRepository;
  stockLevelRepository: InventoryStockLevelRepository;
  movementRepository: InventoryMovementRepository;
  warehouseRepository: WarehouseRepository;
  financialRepository: FinancialOperationRepository;
  companyId: string;
  itemId: string;
  warehouseId: string;
  desiredOnHand: number;
  unitCost?: number;
  actorUserId: string;
  reason: string;
}): Promise<void> {
  const {
    itemRepository,
    stockLevelRepository,
    movementRepository,
    warehouseRepository,
    financialRepository,
    companyId,
    itemId,
    warehouseId,
    desiredOnHand,
    unitCost,
    actorUserId,
    reason,
  } = params;

  const level = await stockLevelRepository.getByItemAndWarehouse(itemId, warehouseId);
  const current = level?.onHand ?? 0;
  const target = Math.max(0, desiredOnHand);
  const delta = target - current;

  if (delta > 0) {
    await receiveStockUseCase(
      itemRepository,
      stockLevelRepository,
      movementRepository,
      warehouseRepository,
      financialRepository,
      {
        companyId,
        itemId,
        warehouseId,
        quantity: delta,
        unitCost,
        actorUserId,
        reason,
        createExpense: false,
      },
    );
    return;
  }

  if (delta < 0) {
    await adjustStockUseCase(
      itemRepository,
      stockLevelRepository,
      movementRepository,
      warehouseRepository,
      {
        companyId,
        itemId,
        warehouseId,
        quantity: Math.abs(delta),
        direction: "decrease",
        reason,
        actorUserId,
      },
    );
    return;
  }

  if (!level) {
    await stockLevelRepository.ensureLevel(companyId, itemId, warehouseId);
  }
}

export async function syncWarehouseGridRowUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    actorUserId: string;
    warehouseId?: string;
    row: WarehouseGridRow;
    baseline?: import("@/domain/inventory").InventoryItem;
  },
): Promise<WarehouseGridSyncResult> {
  const { companyId, actorUserId, row, baseline } = params;
  const warehouseId = await resolveWarehouseId(
    warehouseRepository,
    companyId,
    params.warehouseId,
  );

  if (row.rowKind === "empty") {
    const upsertInput = parseDraftToUpsert(row, companyId, actorUserId);
    if (!upsertInput.sku || !upsertInput.name) return undefined;

    // Idempotent create: prior partial syncs often leave the item without a
    // stock level. Re-saving the same SKU must update + attach stock, not throw.
    const existing = await itemRepository.findBySku(companyId, upsertInput.sku);
    const itemId = existing
      ? await upsertInventoryItemUseCase(itemRepository, upsertInput, existing.id)
      : await upsertInventoryItemUseCase(itemRepository, upsertInput);

    await syncWarehouseOnHand({
      itemRepository,
      stockLevelRepository,
      movementRepository,
      warehouseRepository,
      financialRepository,
      companyId,
      itemId,
      warehouseId,
      desiredOnHand: parseDraftOnHand(row),
      unitCost: upsertInput.purchasePrice,
      actorUserId,
      reason: "Initial stock from spreadsheet",
    });

    if (upsertInput.warehouseLocation) {
      await syncItemLocationAssignmentUseCase({
        companyId,
        itemId,
        warehouseId,
        locationText: upsertInput.warehouseLocation,
        actorUserId,
      }).catch(() => undefined);
    }
    return itemId;
  }

  if (!baseline) return row.id;

  if (savedRowShouldArchive(row)) {
    await itemRepository.archive(row.id, companyId, actorUserId);
    return WAREHOUSE_ROW_ARCHIVED;
  }

  const metadataChanged = savedRowMetadataChanged(baseline, row);
  const stockChanged = savedRowStockChanged(baseline, row);
  const upsertInput = parseDraftToUpsert(row, companyId, actorUserId);

  if (metadataChanged) {
    await upsertInventoryItemUseCase(itemRepository, upsertInput, row.id);
  }

  if ((baseline.warehouseLocation ?? "") !== (row.warehouseLocation ?? "")) {
    await syncItemLocationAssignmentUseCase({
      companyId,
      itemId: row.id,
      warehouseId,
      locationText: row.warehouseLocation,
      previousText: baseline.warehouseLocation ?? baseline.primaryLocationCode,
      actorUserId,
    }).catch(() => undefined);
  }

  if (stockChanged) {
    await syncWarehouseOnHand({
      itemRepository,
      stockLevelRepository,
      movementRepository,
      warehouseRepository,
      financialRepository,
      companyId,
      itemId: row.id,
      warehouseId,
      desiredOnHand: row.totalOnHand,
      unitCost: upsertInput.purchasePrice,
      actorUserId,
      reason: "Stock adjustment from spreadsheet",
    });
  }

  return row.id;
}
