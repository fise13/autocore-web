import {
  addDoc,
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  where,
  query,
} from "firebase/firestore";

import { InventoryMovement, RecordMovementInput } from "@/domain/inventory-movement";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  applyMovementToStock,
  computeWeightedAverageCost,
} from "@/lib/warehouse/movement-logic";

export type RecordMovementResult = {
  movementId: string;
  movement: InventoryMovement;
};

export async function recordMovementUseCase(
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  input: RecordMovementInput,
): Promise<RecordMovementResult> {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const normalizedCompanyId = normalizeCompanyId(input.companyId);
  const idempotencyKey =
    input.idempotencyKey ??
    `${input.type}:${input.itemId}:${input.warehouseId}:${input.quantity}:${Date.now()}`;

  const existing = await getDocs(
    query(
      collection(db, "inventoryMovements"),
      where("companyId", "==", normalizedCompanyId),
      where("idempotencyKey", "==", idempotencyKey),
    ),
  );
  if (!existing.empty) {
    const docSnap = existing.docs[0];
    return {
      movementId: docSnap.id,
      movement: movementRepository.mapMovement(docSnap.id, docSnap.data() as Record<string, unknown>),
    };
  }

  const item = await itemRepository.getById(input.itemId);
  if (!item) {
    throw new Error("Позиция не найдена");
  }

  const stockLevelRef = stockLevelRepository.buildDocRef(input.itemId, input.warehouseId);
  const itemRef = doc(db, "inventoryItems", input.itemId);
  const movementRef = doc(collection(db, "inventoryMovements"));

  const movementId = await runTransaction(db, async (transaction) => {
    const stockSnap = await transaction.get(stockLevelRef);
    const itemSnap = await transaction.get(itemRef);

    const stockData = stockSnap.exists() ? (stockSnap.data() as Record<string, unknown>) : null;
    const beforeOnHand = Number(stockData?.onHand ?? 0);
    const beforeReserved = Number(stockData?.reserved ?? 0);

    const { next } = applyMovementToStock(
      {
        onHand: beforeOnHand,
        reserved: beforeReserved,
        available: beforeOnHand - beforeReserved,
      },
      input.type,
      input.quantity,
      input.adjustmentDirection,
    );

    const unitCost = input.unitCost ?? item.averageCost ?? item.purchasePrice ?? 0;
    const totalCost = unitCost * input.quantity;

    const movementPayload = movementRepository.buildMovementPayload({
      companyId: normalizedCompanyId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      type: input.type,
      quantity: input.quantity,
      unitCost,
      totalCost,
      beforeOnHand,
      afterOnHand: next.onHand,
      beforeReserved,
      afterReserved: next.reserved,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      documentId: input.documentId,
      pairedMovementId: input.pairedMovementId,
      reason: input.reason,
      idempotencyKey,
      reversalOfMovementId: input.reversalOfMovementId,
      actorUserId: input.actorUserId,
    });

    transaction.set(stockLevelRef, stockLevelRepository.buildStockLevelPayload(
      normalizedCompanyId,
      input.itemId,
      input.warehouseId,
      next.onHand,
      next.reserved,
    ));

    transaction.set(movementRef, movementPayload);

    const itemData = itemSnap.exists() ? (itemSnap.data() as Record<string, unknown>) : {};
    const deltaOnHand = next.onHand - beforeOnHand;
    const deltaReserved = next.reserved - beforeReserved;
    const totalOnHand = Number(itemData.totalOnHand ?? 0) + deltaOnHand;
    const totalReserved = Number(itemData.totalReserved ?? 0) + deltaReserved;

    const currentAverageCost = Number(itemData.averageCost ?? itemData.purchasePrice ?? 0);
    const currentTotalOnHand = Number(itemData.totalOnHand ?? 0);
    let averageCost = currentAverageCost;
    if (input.type === "receipt" && input.quantity > 0) {
      averageCost = computeWeightedAverageCost(
        currentTotalOnHand,
        currentAverageCost,
        input.quantity,
        unitCost,
      );
    }

    const stockValue = totalOnHand * averageCost;
    transaction.update(itemRef, {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      stockValue,
      averageCost,
      purchasePrice: input.type === "receipt" ? unitCost : itemData.purchasePrice,
      updatedAt: serverTimestamp(),
      updatedByUserId: input.actorUserId,
    });

    return movementRef.id;
  });

  await activity.append(normalizedCompanyId, {
    actor: input.actorUserId,
    action: "inventory.movement_created",
    target: `inventoryMovement:${movementId}`,
    targetId: movementId,
    targetName: item.name,
    metadata: {
      type: input.type,
      quantity: input.quantity,
      itemId: input.itemId,
    },
  }).catch(() => undefined);

  const movement = await movementRepository.getById(movementId);
  if (!movement) {
    throw new Error("Движение создано, но не найдено");
  }

  return { movementId, movement };
}
