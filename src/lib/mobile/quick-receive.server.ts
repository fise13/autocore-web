import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  applyMovementToStock,
  computeAvailable,
  computeWeightedAverageCost,
} from "@/lib/warehouse/movement-logic";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

export type MobileQuickReceiveInput = {
  companyId: string;
  itemId: string;
  quantity: number;
  warehouseId?: string;
  unitCost?: number;
  actorUserId: string;
  idempotencyKey?: string;
};

export type MobileQuickReceiveResult = {
  movementId: string;
  warehouseId: string;
  onHand: number;
  available: number;
  itemTotalOnHand: number;
  itemTotalAvailable: number;
};

async function resolveDefaultWarehouseId(companyId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("warehouses")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .limit(5)
    .get();

  if (snap.empty) return null;
  const preferred = snap.docs.find((doc) => doc.data().isDefault === true);
  return (preferred ?? snap.docs[0]).id;
}

export async function quickReceiveMobileStock(
  input: MobileQuickReceiveInput,
): Promise<MobileQuickReceiveResult> {
  const quantity = Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Укажите количество больше нуля");
  }

  const normalizedCompanyId = normalizeCompanyId(input.companyId);
  const warehouseId = input.warehouseId?.trim() || (await resolveDefaultWarehouseId(normalizedCompanyId));
  if (!warehouseId) {
    throw new Error("Склад не найден");
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    `mobile:receipt:${input.itemId}:${warehouseId}:${quantity}:${input.actorUserId}`;

  const db = getAdminFirestore();

  const existing = await db
    .collection("inventoryMovements")
    .where("companyId", "==", normalizedCompanyId)
    .where("idempotencyKey", "==", idempotencyKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    const movement = existing.docs[0]!.data() as Record<string, unknown>;
    const stockRef = db
      .collection("inventoryStockLevels")
      .doc(stockLevelDocumentId(input.itemId, warehouseId));
    const stockSnap = await stockRef.get();
    const stockData = stockSnap.data() as Record<string, unknown> | undefined;
    const onHand = Number(stockData?.onHand ?? movement.afterOnHand ?? 0);
    const reserved = Number(stockData?.reserved ?? 0);
    const itemSnap = await db.collection("inventoryItems").doc(input.itemId).get();
    const itemData = itemSnap.data() as Record<string, unknown> | undefined;
    return {
      movementId: existing.docs[0]!.id,
      warehouseId,
      onHand,
      available: computeAvailable(onHand, reserved),
      itemTotalOnHand: Number(itemData?.totalOnHand ?? 0),
      itemTotalAvailable: Number(itemData?.totalAvailable ?? 0),
    };
  }

  const itemRef = db.collection("inventoryItems").doc(input.itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) {
    throw new Error("Позиция не найдена");
  }
  const itemData = itemSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(itemData.companyId ?? "")) !== normalizedCompanyId) {
    throw new Error("Позиция не найдена");
  }

  const unitCost =
    input.unitCost ?? Number(itemData.purchasePrice ?? itemData.averageCost ?? 0);
  const stockRef = db.collection("inventoryStockLevels").doc(stockLevelDocumentId(input.itemId, warehouseId));
  const movementRef = db.collection("inventoryMovements").doc();

  let resultOnHand = 0;
  let resultReserved = 0;
  let itemTotalOnHand = 0;
  let itemTotalAvailable = 0;

  await db.runTransaction(async (transaction) => {
    const stockSnap = await transaction.get(stockRef);
    const freshItemSnap = await transaction.get(itemRef);

    const stockData = stockSnap.exists ? (stockSnap.data() as Record<string, unknown>) : null;
    const beforeOnHand = Number(stockData?.onHand ?? 0);
    const beforeReserved = Number(stockData?.reserved ?? 0);

    const { next } = applyMovementToStock(
      {
        onHand: beforeOnHand,
        reserved: beforeReserved,
        available: computeAvailable(beforeOnHand, beforeReserved),
      },
      "receipt",
      quantity,
    );

    transaction.set(
      stockRef,
      {
        companyId: normalizedCompanyId,
        itemId: input.itemId,
        warehouseId,
        onHand: next.onHand,
        reserved: next.reserved,
        available: next.available,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(movementRef, {
      companyId: normalizedCompanyId,
      itemId: input.itemId,
      warehouseId,
      type: "receipt",
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
      beforeOnHand,
      afterOnHand: next.onHand,
      beforeReserved,
      afterReserved: next.reserved,
      referenceType: "manual",
      referenceId: "mobile",
      reason: "Приход с телефона",
      idempotencyKey,
      actorUserId: input.actorUserId,
      createdAt: FieldValue.serverTimestamp(),
    });

    const freshItemData = freshItemSnap.data() as Record<string, unknown>;
    const deltaOnHand = next.onHand - beforeOnHand;
    const currentAverageCost = Number(freshItemData.averageCost ?? freshItemData.purchasePrice ?? 0);
    const currentTotalOnHand = Number(freshItemData.totalOnHand ?? 0);
    const totalOnHand = currentTotalOnHand + deltaOnHand;
    const totalReserved = Number(freshItemData.totalReserved ?? 0);
    const averageCost = computeWeightedAverageCost(
      currentTotalOnHand,
      currentAverageCost,
      quantity,
      unitCost,
    );
    const stockValue = totalOnHand * averageCost;

    transaction.update(itemRef, {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      stockValue: Number.isFinite(stockValue) ? stockValue : 0,
      averageCost: Number.isFinite(averageCost) ? averageCost : 0,
      purchasePrice: unitCost,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUserId: input.actorUserId,
    });

    resultOnHand = next.onHand;
    resultReserved = next.reserved;
    itemTotalOnHand = totalOnHand;
    itemTotalAvailable = totalOnHand - totalReserved;
  });

  return {
    movementId: movementRef.id,
    warehouseId,
    onHand: resultOnHand,
    available: computeAvailable(resultOnHand, resultReserved),
    itemTotalOnHand,
    itemTotalAvailable,
  };
}
