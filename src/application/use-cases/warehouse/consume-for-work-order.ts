import { ConsumeForWorkOrderInput } from "@/domain/work-order-consumption";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

import { createExpenseOperationUseCase } from "../create-expense-operation";
import { recordMovementUseCase } from "./record-movement";

export type ConsumeForWorkOrderResult = {
  movementIds: string[];
  totalCost: number;
};

export async function consumeForWorkOrderUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  warehouseRepository: WarehouseRepository,
  financialRepository: FinancialOperationRepository,
  input: ConsumeForWorkOrderInput,
): Promise<ConsumeForWorkOrderResult> {
  const warehouse =
    input.warehouseId
      ? { id: input.warehouseId }
      : await warehouseRepository.getDefault(input.companyId);
  if (!warehouse) {
    throw new Error("Склад не найден");
  }

  const movementIds: string[] = [];
  let totalCost = 0;

  for (const line of input.lines) {
    if (line.quantity <= 0 || !line.itemId?.trim()) continue;

    const item = await itemRepository.getById(line.itemId);
    if (!item) {
      throw new Error(`Позиция ${line.itemId} не найдена`);
    }

    const unitCost = line.unitCost ?? item.averageCost ?? item.purchasePrice ?? 0;
    const lineCost = unitCost * line.quantity;
    totalCost += lineCost;

    const { movementId } = await recordMovementUseCase(
      itemRepository,
      stockLevelRepository,
      movementRepository,
      {
        companyId: input.companyId,
        itemId: line.itemId,
        warehouseId: warehouse.id,
        type: "consumption",
        quantity: line.quantity,
        unitCost,
        referenceType: "work_order",
        referenceId: input.workOrderId,
        reason: line.note ?? input.reason ?? `Списание по заказ-наряду ${input.workOrderId}`,
        idempotencyKey: `work_order:${input.workOrderId}:${line.itemId}:${line.quantity}`,
        actorUserId: input.actorUserId,
      },
    );
    movementIds.push(movementId);

    if (input.createAccountingEntries !== false && lineCost > 0) {
      await createExpenseOperationUseCase(financialRepository, {
        companyId: input.companyId,
        amount: lineCost,
        account: "cashbox",
        paymentMethod: "transfer",
        comment: line.note ?? `Расход: ${item.name} × ${line.quantity}`,
        category: "warehouse_consumption",
        description: `Заказ-наряд ${input.workOrderId}`,
        createdByUserId: input.actorUserId,
        relatedInventoryItemId: line.itemId,
        relatedMovementId: movementId,
        relatedWarehouseId: warehouse.id,
        costBasis: unitCost,
      });
    }
  }

  return { movementIds, totalCost };
}
