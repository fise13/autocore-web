import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  applyMovementToStock,
  computeAvailable,
} from "@/lib/warehouse/movement-logic";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

export type MobileQuickAdjustInput = {
  companyId: string;
  itemId: string;
  direction: "increase" | "decrease";
  quantity: number;
  warehouseId?: string;
  actorUserId: string;
  idempotencyKey?: string;
  reason?: string;
};

export type MobileQuickAdjustResult = {
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

export async function quickAdjustMobileStock(
  input: MobileQuickAdjustInput,
): Promise<MobileQuickAdjustResult> {
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
    `mobile:adjust:${input.itemId}:${warehouseId}:${input.direction}:${quantity}:${input.actorUserId}:${Date.now()}`;

  const db = getAdminFirestore();

  const itemRef = db.collection("inventoryItems").doc(input.itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) {
    throw new Error("Позиция не найдена");
  }
  const itemData = itemSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(itemData.companyId ?? "")) !== normalizedCompanyId) {
    throw new Error("Позиция не найдена");
  }

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
      "adjustment",
      quantity,
      input.direction,
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
      type: "adjustment",
      quantity,
      adjustmentDirection: input.direction,
      beforeOnHand,
      afterOnHand: next.onHand,
      beforeReserved,
      afterReserved: next.reserved,
      referenceType: "manual",
      referenceId: "mobile",
      reason: input.reason ?? "Корректировка с телефона",
      idempotencyKey,
      actorUserId: input.actorUserId,
      createdAt: FieldValue.serverTimestamp(),
    });

    const freshItemData = freshItemSnap.data() as Record<string, unknown>;
    const deltaOnHand = next.onHand - beforeOnHand;
    const currentTotalOnHand = Number(freshItemData.totalOnHand ?? 0);
    const totalOnHand = currentTotalOnHand + deltaOnHand;
    const totalReserved = Number(freshItemData.totalReserved ?? 0);

    transaction.update(itemRef, {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
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
