import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { InventoryDocumentRepository } from "@/infrastructure/firestore/inventory-document-repository";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";

import { recordMovementUseCase } from "./record-movement";

export async function transferStockUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  documentRepository: InventoryDocumentRepository,
  params: {
    companyId: string;
    itemId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reason?: string;
    actorUserId: string;
  },
) {
  if (params.fromWarehouseId === params.toWarehouseId) {
    throw new Error("Склады должны отличаться");
  }

  const outResult = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: params.itemId,
      warehouseId: params.fromWarehouseId,
      type: "transfer_out",
      quantity: params.quantity,
      referenceType: "transfer",
      reason: params.reason ?? "Перемещение между складами",
      actorUserId: params.actorUserId,
    },
  );

  const inResult = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: params.itemId,
      warehouseId: params.toWarehouseId,
      type: "transfer_in",
      quantity: params.quantity,
      referenceType: "transfer",
      referenceId: outResult.movementId,
      pairedMovementId: outResult.movementId,
      reason: params.reason ?? "Перемещение между складами",
      actorUserId: params.actorUserId,
    },
  );

  const documentId = await documentRepository.createDraft({
    companyId: params.companyId,
    type: "transfer",
    referenceType: "transfer",
    referenceId: outResult.movementId,
    movementIds: [outResult.movementId, inResult.movementId],
    metadata: {
      fromWarehouseId: params.fromWarehouseId,
      toWarehouseId: params.toWarehouseId,
      quantity: String(params.quantity),
    },
    createdByUserId: params.actorUserId,
  });

  try {
    await createActivityLogRepository().append(params.companyId, {
      actor: params.actorUserId,
      action: "inventory.transfer_completed",
      target: `inventoryItem:${params.itemId}`,
      targetId: params.itemId,
      metadata: {
        fromWarehouseId: params.fromWarehouseId,
        toWarehouseId: params.toWarehouseId,
        quantity: params.quantity,
        documentId,
      },
    });
  } catch {
    // Activity log is best-effort; transfer movements and document already succeeded.
  }

  return { outMovementId: outResult.movementId, inMovementId: inResult.movementId, documentId };
}
