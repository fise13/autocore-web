import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

import { recordMovementUseCase } from "./record-movement";

export async function releaseReservationUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  params: {
    companyId: string;
    itemId: string;
    warehouseId?: string;
    quantity: number;
    referenceId?: string;
    reason?: string;
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

  return recordMovementUseCase(itemRepository, stockLevelRepository, movementRepository, {
    companyId: params.companyId,
    itemId: params.itemId,
    warehouseId: warehouse.id,
    type: "reservation_release",
    quantity: params.quantity,
    referenceType: params.referenceId ? "work_order" : "manual",
    referenceId: params.referenceId,
    reason: params.reason ?? "Снятие резерва склада",
    idempotencyKey: `reservation_release:${params.referenceId ?? "manual"}:${params.itemId}:${params.quantity}`,
    actorUserId: params.actorUserId,
  });
}
