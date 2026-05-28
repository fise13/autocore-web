import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { InventoryMovement } from "@/domain/inventory-movement";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "inventoryMovements";

function mapMovement(id: string, data: Record<string, unknown>): InventoryMovement {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    itemId: String(data.itemId ?? ""),
    warehouseId: String(data.warehouseId ?? ""),
    type: data.type as InventoryMovement["type"],
    quantity: Number(data.quantity ?? 0),
    unitCost: data.unitCost == null ? undefined : Number(data.unitCost),
    totalCost: data.totalCost == null ? undefined : Number(data.totalCost),
    beforeOnHand: Number(data.beforeOnHand ?? 0),
    afterOnHand: Number(data.afterOnHand ?? 0),
    beforeReserved: Number(data.beforeReserved ?? 0),
    afterReserved: Number(data.afterReserved ?? 0),
    referenceType: data.referenceType as InventoryMovement["referenceType"],
    referenceId: typeof data.referenceId === "string" ? data.referenceId : undefined,
    documentId: typeof data.documentId === "string" ? data.documentId : undefined,
    pairedMovementId: typeof data.pairedMovementId === "string" ? data.pairedMovementId : undefined,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    idempotencyKey: String(data.idempotencyKey ?? ""),
    reversalOfMovementId:
      typeof data.reversalOfMovementId === "string" ? data.reversalOfMovementId : undefined,
    actorUserId: String(data.actorUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export type InventoryMovementRepository = ReturnType<typeof createInventoryMovementRepository>;

export function createInventoryMovementRepository() {
  const db = getFirestoreDb();
  const ref = collection(db, COLLECTION);

  return {
    subscribeByItem(
      companyId: string,
      itemId: string,
      onData: (movements: InventoryMovement[]) => void,
      onError?: (error: Error) => void,
      maxEntries = 50,
    ) {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        where("itemId", "==", itemId),
        orderBy("createdAt", "desc"),
        limit(maxEntries),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(
            snapshot.docs.map((item) => mapMovement(item.id, item.data() as Record<string, unknown>)),
          );
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    subscribeRecent(
      companyId: string,
      onData: (movements: InventoryMovement[]) => void,
      onError?: (error: Error) => void,
      maxEntries = 20,
    ) {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        orderBy("createdAt", "desc"),
        limit(maxEntries),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(
            snapshot.docs.map((item) => mapMovement(item.id, item.data() as Record<string, unknown>)),
          );
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async getById(movementId: string): Promise<InventoryMovement | null> {
      const snapshot = await getDoc(doc(db, COLLECTION, movementId));
      if (!snapshot.exists()) return null;
      return mapMovement(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    buildMovementPayload(movement: Omit<InventoryMovement, "id" | "createdAt">) {
      return {
        ...movement,
        companyId: normalizeCompanyId(movement.companyId),
        createdAt: serverTimestamp(),
      };
    },

    collectionRef: ref,
    mapMovement,
  };
}
