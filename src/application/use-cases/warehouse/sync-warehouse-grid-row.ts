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
import { upsertInventoryItemUseCase } from "./upsert-inventory-item";

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

  if (row.rowKind === "empty") {
    const upsertInput = parseDraftToUpsert(row, companyId, actorUserId);
    if (!upsertInput.sku || !upsertInput.name) return undefined;

    const itemId = await upsertInventoryItemUseCase(itemRepository, upsertInput);
    const initialQty = parseDraftOnHand(row);
    if (initialQty > 0) {
      await receiveStockUseCase(
        itemRepository,
        stockLevelRepository,
        movementRepository,
        warehouseRepository,
        financialRepository,
        {
          companyId,
          itemId,
          warehouseId: params.warehouseId,
          quantity: initialQty,
          unitCost: upsertInput.purchasePrice,
          actorUserId,
          reason: "Начальный остаток из таблицы",
          createExpense: false,
        },
      );
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

  if (stockChanged) {
    const delta = row.totalOnHand - baseline.totalOnHand;
    if (delta !== 0) {
      await adjustStockUseCase(
        itemRepository,
        stockLevelRepository,
        movementRepository,
        warehouseRepository,
        {
          companyId,
          itemId: row.id,
          warehouseId: params.warehouseId,
          quantity: Math.abs(delta),
          direction: delta > 0 ? "increase" : "decrease",
          reason: "Корректировка из таблицы склада",
          actorUserId,
        },
      );
    }
  }

  return row.id;
}
