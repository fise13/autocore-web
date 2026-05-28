import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { InventoryStockLevel } from "@/domain/inventory";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";
import { computeAvailable } from "@/lib/warehouse/movement-logic";

const COLLECTION = "inventoryStockLevels";

function mapStockLevel(id: string, data: Record<string, unknown>): InventoryStockLevel {
  const onHand = Number(data.onHand ?? 0);
  const reserved = Number(data.reserved ?? 0);
  return {
    id,
    companyId: String(data.companyId ?? ""),
    itemId: String(data.itemId ?? ""),
    warehouseId: String(data.warehouseId ?? ""),
    onHand,
    reserved,
    available: Number(data.available ?? computeAvailable(onHand, reserved)),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

export type InventoryStockLevelRepository = ReturnType<typeof createInventoryStockLevelRepository>;

export function createInventoryStockLevelRepository() {
  const db = getFirestoreDb();
  const ref = collection(db, COLLECTION);

  return {
    subscribeByItem(
      companyId: string,
      itemId: string,
      onData: (levels: InventoryStockLevel[]) => void,
      onError?: (error: Error) => void,
    ) {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        where("itemId", "==", itemId),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapStockLevel(item.id, item.data() as Record<string, unknown>)));
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async getByItemAndWarehouse(
      itemId: string,
      warehouseId: string,
    ): Promise<InventoryStockLevel | null> {
      const id = stockLevelDocumentId(itemId, warehouseId);
      const snapshot = await getDoc(doc(db, COLLECTION, id));
      if (!snapshot.exists()) return null;
      return mapStockLevel(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async listByCompany(companyId: string): Promise<InventoryStockLevel[]> {
      const snapshot = await getDocs(
        query(ref, where("companyId", "==", normalizeCompanyId(companyId)), limit(1000)),
      );
      return snapshot.docs.map((item) => mapStockLevel(item.id, item.data() as Record<string, unknown>));
    },

    buildDocRef(itemId: string, warehouseId: string) {
      return doc(db, COLLECTION, stockLevelDocumentId(itemId, warehouseId));
    },

    buildStockLevelPayload(
      companyId: string,
      itemId: string,
      warehouseId: string,
      onHand: number,
      reserved: number,
    ) {
      return {
        companyId: normalizeCompanyId(companyId),
        itemId,
        warehouseId,
        onHand,
        reserved,
        available: computeAvailable(onHand, reserved),
        updatedAt: serverTimestamp(),
      };
    },

    mapStockLevel,
  };
}
