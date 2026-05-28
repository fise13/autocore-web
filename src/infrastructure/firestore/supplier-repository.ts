import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { CreateSupplierInput, Supplier } from "@/domain/supplier";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "suppliers";

function mapSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? ""),
    contactName: typeof data.contactName === "string" ? data.contactName : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

export type SupplierRepository = ReturnType<typeof createSupplierRepository>;

export function createSupplierRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, COLLECTION);

  return {
    subscribe(
      companyId: string,
      onData: (suppliers: Supplier[]) => void,
      onError?: (error: Error) => void,
    ) {
      const q = query(ref, where("companyId", "==", normalizeCompanyId(companyId)));
      return onSnapshot(
        q,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapSupplier(item.id, item.data() as Record<string, unknown>)));
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async create(input: CreateSupplierInput): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const created = await addDoc(ref, {
        companyId: normalizedCompanyId,
        name: input.name.trim(),
        contactName: input.contactName?.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        notes: input.notes?.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (input.actorUserId) {
        await activity.append(normalizedCompanyId, {
          actor: input.actorUserId,
          action: "inventory.supplier_created",
          target: `supplier:${created.id}`,
          targetId: created.id,
          targetName: input.name,
        });
      }
      return created.id;
    },

    mapSupplier,
  };
}
