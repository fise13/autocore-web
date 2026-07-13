import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";

import { InventoryLocationBalance } from "@/domain/inventory-location-balance";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { computeAvailable } from "@/lib/warehouse/movement-logic";
import { locationBalanceDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

const COLLECTION = "inventoryLocationBalances";

function mapBalance(id: string, data: Record<string, unknown>): InventoryLocationBalance {
  const onHand = Number(data.onHand ?? 0);
  const reserved = Number(data.reserved ?? 0);
  return {
    id,
    companyId: String(data.companyId ?? ""),
    itemId: String(data.itemId ?? ""),
    warehouseId: String(data.warehouseId ?? ""),
    locationId: String(data.locationId ?? ""),
    onHand,
    reserved,
    available: Number(data.available ?? computeAvailable(onHand, reserved)),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

export type InventoryLocationBalanceRepository = ReturnType<
  typeof createInventoryLocationBalanceRepository
>;

export function createInventoryLocationBalanceRepository() {
  const db = getFirestoreDb();
  const ref = collection(db, COLLECTION);

  return {
    subscribeByWarehouse(
      companyId: string,
      warehouseId: string,
      onData: (balances: InventoryLocationBalance[]) => void,
      onError?: (error: Error) => void,
    ): Unsubscribe {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        where("warehouseId", "==", warehouseId),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapBalance(item.id, item.data() as Record<string, unknown>)));
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async listByLocation(
      companyId: string,
      locationId: string,
    ): Promise<InventoryLocationBalance[]> {
      const snapshot = await getDocs(
        query(
          ref,
          where("companyId", "==", normalizeCompanyId(companyId)),
          where("locationId", "==", locationId),
          limit(1000),
        ),
      );
      return snapshot.docs
        .map((item) => mapBalance(item.id, item.data() as Record<string, unknown>))
        .filter((balance) => balance.onHand > 0 || balance.reserved > 0 || balance.available > 0);
    },

    async listByItemWarehouse(
      companyId: string,
      itemId: string,
      warehouseId: string,
    ): Promise<InventoryLocationBalance[]> {
      const snapshot = await getDocs(
        query(
          ref,
          where("companyId", "==", normalizeCompanyId(companyId)),
          where("itemId", "==", itemId),
          where("warehouseId", "==", warehouseId),
          limit(500),
        ),
      );
      return snapshot.docs.map((item) => mapBalance(item.id, item.data() as Record<string, unknown>));
    },

    async getByItemAndLocation(
      itemId: string,
      locationId: string,
    ): Promise<InventoryLocationBalance | null> {
      const snapshot = await getDoc(doc(db, COLLECTION, locationBalanceDocumentId(itemId, locationId)));
      if (!snapshot.exists()) return null;
      return mapBalance(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    buildDocRef(itemId: string, locationId: string) {
      return doc(db, COLLECTION, locationBalanceDocumentId(itemId, locationId));
    },

    buildBalancePayload(
      companyId: string,
      itemId: string,
      warehouseId: string,
      locationId: string,
      onHand: number,
      reserved: number,
    ) {
      return {
        companyId: normalizeCompanyId(companyId),
        itemId,
        warehouseId,
        locationId,
        onHand,
        reserved,
        available: computeAvailable(onHand, reserved),
        updatedAt: serverTimestamp(),
      };
    },

    applyInTransaction(
      transaction: Transaction,
      params: {
        companyId: string;
        itemId: string;
        warehouseId: string;
        locationId: string;
        onHand: number;
        reserved: number;
      },
    ) {
      transaction.set(
        this.buildDocRef(params.itemId, params.locationId),
        this.buildBalancePayload(
          params.companyId,
          params.itemId,
          params.warehouseId,
          params.locationId,
          params.onHand,
          params.reserved,
        ),
        { merge: true },
      );
    },

    mapBalance,
  };
}
