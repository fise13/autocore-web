import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";

import { recordMovementUseCase } from "./record-movement";
import { reversalTypeFor } from "@/lib/warehouse/movement-logic";

export async function reverseMovementUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  params: {
    companyId: string;
    movementId: string;
    actorUserId: string;
    reason?: string;
  },
): Promise<string> {
  const original = await movementRepository.getById(params.movementId);
  if (!original) {
    throw new Error("Исходное движение не найдено");
  }
  if (original.reversalOfMovementId) {
    throw new Error("Нельзя откатить движение-откат");
  }

  const reverseType = reversalTypeFor(original.type);
  const { movementId } = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: original.itemId,
      warehouseId: original.warehouseId,
      type: reverseType,
      quantity: original.quantity,
      unitCost: original.unitCost,
      referenceType: original.referenceType,
      referenceId: original.referenceId,
      reason: params.reason ?? `Откат импорта (${original.reason ?? original.type})`,
      actorUserId: params.actorUserId,
      reversalOfMovementId: original.id,
      idempotencyKey: `reversal:${original.id}`,
      adjustmentDirection: reverseType === "adjustment" ? "decrease" : undefined,
    },
  );

  return movementId;
}
