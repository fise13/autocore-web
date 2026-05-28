import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

import { recordMovementUseCase } from "./record-movement";

export async function adjustStockUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  params: {
    companyId: string;
    itemId: string;
    warehouseId?: string;
    quantity: number;
    direction: "increase" | "decrease";
    reason: string;
    actorUserId: string;
  },
) {
  const warehouse =
    params.warehouseId
      ? { id: params.warehouseId }
      : await warehouseRepository.getDefault(params.companyId);
  if (!warehouse) {
    throw new Error("Склад не найден");
  }

  const { movementId } = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: params.itemId,
      warehouseId: warehouse.id,
      type: "adjustment",
      quantity: params.quantity,
      adjustmentDirection: params.direction,
      referenceType: "manual",
      reason: params.reason,
      actorUserId: params.actorUserId,
    },
  );

  return movementId;
}
