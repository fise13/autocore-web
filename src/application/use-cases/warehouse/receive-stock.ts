import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

import { createExpenseOperationUseCase } from "../create-expense-operation";
import { recordMovementUseCase } from "./record-movement";

export async function receiveStockUseCase(
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
    unitCost?: number;
    supplierId?: string;
    reason?: string;
    actorUserId: string;
    createExpense?: boolean;
    account?: OperationAccount;
    paymentMethod?: PaymentMethod;
    referenceType?: "purchase" | "import" | "manual";
    referenceId?: string;
    idempotencyKey?: string;
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

  const unitCost = params.unitCost ?? item.purchasePrice ?? item.averageCost ?? 0;
  const { movementId } = await recordMovementUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    {
      companyId: params.companyId,
      itemId: params.itemId,
      warehouseId: warehouse.id,
      type: "receipt",
      quantity: params.quantity,
      unitCost,
      referenceType: params.referenceType ?? "purchase",
      referenceId: params.referenceId ?? params.supplierId,
      reason: params.reason ?? "Приход на склад",
      actorUserId: params.actorUserId,
      idempotencyKey: params.idempotencyKey,
    },
  );

  if (params.createExpense && unitCost > 0) {
    await createExpenseOperationUseCase(financialRepository, {
      companyId: params.companyId,
      amount: unitCost * params.quantity,
      account: params.account ?? "cashbox",
      paymentMethod: params.paymentMethod ?? "transfer",
      comment: `Закупка: ${item.name} (${params.quantity} ${item.unit})`,
      createdByUserId: params.actorUserId,
      relatedInventoryItemId: params.itemId,
      relatedMovementId: movementId,
      relatedWarehouseId: warehouse.id,
      costBasis: unitCost,
    });
  }

  return movementId;
}
