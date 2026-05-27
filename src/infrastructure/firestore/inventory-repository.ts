import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";

import { InventoryItem } from "@/domain/inventory";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  return new Date();
}

function mapItem(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? ""),
    sku: typeof data.sku === "string" ? data.sku : "",
    quantity: Number(data.quantity ?? 0),
    unit: typeof data.unit === "string" ? data.unit : "шт",
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

export function createInventoryRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, "inventoryItems");

  return {
    subscribe(companyId: string, onData: (items: InventoryItem[]) => void) {
      const q = query(ref, where("companyId", "==", companyId), orderBy("updatedAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        onData(snapshot.docs.map((item) => mapItem(item.id, item.data() as Record<string, unknown>)));
      });
    },
    async create(companyId: string, name: string, quantity = 0, actorUid?: string) {
      const created = await addDoc(ref, {
        companyId,
        name: name.trim(),
        quantity,
        unit: "шт",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (actorUid) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.item_created",
          target: `inventoryItem:${created.id}`,
        });
      }
    },
    async patchQuantity(id: string, quantity: number) {
      await updateDoc(doc(db, "inventoryItems", id), {
        quantity,
        updatedAt: serverTimestamp(),
      });
    },
  };
}
