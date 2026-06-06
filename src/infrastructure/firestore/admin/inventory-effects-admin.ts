import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { MovementType } from "@/domain/inventory-movement";
import { WorkOrder } from "@/domain/work-order";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { applyMovementToStock, computeAvailable } from "@/lib/warehouse/movement-logic";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

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

async function recordInventoryMovementAdmin(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  referenceType: "work_order";
  referenceId: string;
  idempotencyKey: string;
  actorUserId: string;
  reason?: string;
}): Promise<string> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(params.companyId);

  const existing = await db
    .collection("inventoryMovements")
    .where("companyId", "==", normalizedCompanyId)
    .where("idempotencyKey", "==", params.idempotencyKey)
    .limit(1)
    .get();
  if (!existing.empty) return existing.docs[0].id;

  const itemSnap = await db.collection("inventoryItems").doc(params.itemId).get();
  if (!itemSnap.exists) {
    throw new Error(`Позиция ${params.itemId} не найдена`);
  }
  const itemData = itemSnap.data() as Record<string, unknown>;
  const unitCost = Number(itemData.averageCost ?? itemData.purchasePrice ?? 0);

  const stockRef = db.collection("inventoryStockLevels").doc(stockLevelDocumentId(params.itemId, params.warehouseId));
  const movementRef = db.collection("inventoryMovements").doc();

  await db.runTransaction(async (transaction) => {
    const stockSnap = await transaction.get(stockRef);
    const stockData = stockSnap.exists ? (stockSnap.data() as Record<string, unknown>) : null;
    const beforeOnHand = Number(stockData?.onHand ?? 0);
    const beforeReserved = Number(stockData?.reserved ?? 0);

    const { next } = applyMovementToStock(
      { onHand: beforeOnHand, reserved: beforeReserved, available: computeAvailable(beforeOnHand, beforeReserved) },
      params.type,
      params.quantity,
    );

    transaction.set(
      stockRef,
      {
        companyId: normalizedCompanyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        onHand: next.onHand,
        reserved: next.reserved,
        available: next.available,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(movementRef, {
      companyId: normalizedCompanyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      type: params.type,
      quantity: params.quantity,
      unitCost,
      totalCost: unitCost * params.quantity,
      beforeOnHand,
      afterOnHand: next.onHand,
      beforeReserved,
      afterReserved: next.reserved,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey,
      actorUserId: params.actorUserId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return movementRef.id;
}

export async function processInventoryEventForWorkOrder(
  order: WorkOrder,
  eventType: "InventoryReserved" | "InventoryDeducted" | "InventoryReleased",
  payload: Record<string, unknown>,
  actorUserId: string,
): Promise<void> {
  const itemId = String(payload.itemId ?? "");
  const quantity = Number(payload.quantity ?? 0);
  if (!itemId || quantity <= 0) return;

  const warehouseId = (await resolveDefaultWarehouseId(order.companyId)) ?? "";
  if (!warehouseId) return;

  const movementType: MovementType =
    eventType === "InventoryReserved"
      ? "reservation_hold"
      : eventType === "InventoryReleased"
        ? "reservation_release"
        : "consumption";

  await recordInventoryMovementAdmin({
    companyId: order.companyId,
    itemId,
    warehouseId,
    type: movementType,
    quantity,
    referenceType: "work_order",
    referenceId: order.id,
    idempotencyKey: `${eventType}:${order.id}:${itemId}:${quantity}`,
    actorUserId,
    reason: `Заказ-наряд №${order.number}`,
  });
}
