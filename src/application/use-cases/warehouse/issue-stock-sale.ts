import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

import { createSaleOperationUseCase } from "../create-sale-operation";
import { recordMovementUseCase } from "./record-movement";

export async function issueStockSaleUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    itemId: string;
    warehouseId?: string;
    quantity: number;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment?: string;
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

  const item = await itemRepository.getById(params.itemId);
  if (!item) throw new Error("Позиция не найдена");

  const { movementId } = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: params.itemId,
      warehouseId: warehouse.id,
      type: "issue",
      quantity: params.quantity,
      unitCost: item.averageCost ?? item.purchasePrice,
      referenceType: "sale",
      reason: params.comment ?? "Продажа со склада",
      actorUserId: params.actorUserId,
    },
  );

  await createSaleOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    comment: params.comment ?? `Продажа: ${item.name}`,
    createdByUserId: params.actorUserId,
    relatedInventoryItemId: params.itemId,
    relatedMovementId: movementId,
    relatedWarehouseId: warehouse.id,
    costBasis: item.averageCost ?? item.purchasePrice ?? undefined,
  });

  return movementId;
}
