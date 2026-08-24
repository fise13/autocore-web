import { adjustStockUseCase } from "@/application/use-cases/warehouse/adjust-stock";
import { stocktakeDifference, type StocktakeLine } from "@/domain/stocktake";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { StocktakeRepository } from "@/infrastructure/firestore/stocktake-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

export async function commitStocktakeUseCase(
  stocktakeRepository: StocktakeRepository,
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  params: {
    companyId: string;
    sessionId: string;
    warehouseId?: string;
    lines: StocktakeLine[];
    actorUserId: string;
  },
) {
  const diffs = params.lines.filter((line) => stocktakeDifference(line) !== 0);
  for (const line of diffs) {
    const delta = stocktakeDifference(line);
    await adjustStockUseCase(itemRepository, stockLevelRepository, movementRepository, warehouseRepository, {
      companyId: params.companyId,
      itemId: line.itemId,
      warehouseId: params.warehouseId,
      quantity: Math.abs(delta),
      direction: delta > 0 ? "increase" : "decrease",
      reason: `Stocktake ${params.sessionId}`,
      actorUserId: params.actorUserId,
    });
  }

  await stocktakeRepository.updateLines(params.companyId, params.sessionId, params.lines);
  await stocktakeRepository.markCommitted(params.companyId, params.sessionId);
}
