import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";

const COLLECTION = "warehousePresence";

export type WarehousePresenceInput = {
  companyId: string;
  userId: string;
  displayName?: string;
  rowId?: string;
  itemId?: string;
  action?: "viewing" | "editing" | "scanning" | "importing";
};

function presenceDocId(companyId: string, userId: string) {
  return `${normalizeCompanyId(companyId)}__${userId}`;
}

export function createWarehousePresenceRepository() {
  const db = getFirestoreDb();

  return {
    async heartbeat(input: WarehousePresenceInput): Promise<void> {
      if (!input.companyId || !input.userId) return;
      await setDoc(
        doc(db, COLLECTION, presenceDocId(input.companyId, input.userId)),
        {
          companyId: normalizeCompanyId(input.companyId),
          userId: input.userId,
          displayName: input.displayName ?? "",
          rowId: input.rowId ?? null,
          itemId: input.itemId ?? null,
          action: input.action ?? "viewing",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },

    async leave(companyId: string, userId: string): Promise<void> {
      if (!companyId || !userId) return;
      await deleteDoc(doc(db, COLLECTION, presenceDocId(companyId, userId)));
    },
  };
}
