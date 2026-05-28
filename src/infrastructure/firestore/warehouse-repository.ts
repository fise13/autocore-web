import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { CreateWarehouseInput, Warehouse } from "@/domain/warehouse";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "warehouses";

function mapWarehouse(id: string, data: Record<string, unknown>): Warehouse {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    localId: data.localId == null ? undefined : Number(data.localId),
    name: String(data.name ?? ""),
    code: typeof data.code === "string" ? data.code : undefined,
    isDefault: Boolean(data.isDefault),
    address: typeof data.address === "string" ? data.address : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

function omitUndefinedFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

export type WarehouseRepository = ReturnType<typeof createWarehouseRepository>;

export function createWarehouseRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, COLLECTION);

  return {
    subscribe(
      companyId: string,
      onData: (warehouses: Warehouse[]) => void,
      onError?: (error: Error) => void,
    ) {
      const q = query(ref, where("companyId", "==", normalizeCompanyId(companyId)));
      return onSnapshot(
        q,
        (snapshot) => {
          onData(
            snapshot.docs
              .map((item) => mapWarehouse(item.id, item.data() as Record<string, unknown>))
              .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
          );
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async list(companyId: string): Promise<Warehouse[]> {
      const snapshot = await getDocs(
        query(ref, where("companyId", "==", normalizeCompanyId(companyId)), limit(50)),
      );
      return snapshot.docs.map((item) => mapWarehouse(item.id, item.data() as Record<string, unknown>));
    },

    async getDefault(companyId: string): Promise<Warehouse | null> {
      const warehouses = await this.list(companyId);
      return warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0] ?? null;
    },

    async create(input: CreateWarehouseInput): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const existing = await this.list(normalizedCompanyId);
      const isDefault = input.isDefault ?? existing.length === 0;

      if (isDefault) {
        for (const warehouse of existing) {
          if (warehouse.isDefault) {
            await updateDoc(doc(db, COLLECTION, warehouse.id), { isDefault: false });
          }
        }
      }

      const created = await addDoc(ref, omitUndefinedFields({
        companyId: normalizedCompanyId,
        localId: input.localId,
        name: input.name.trim(),
        code: input.code?.trim() || undefined,
        isDefault,
        address: input.address?.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      if (input.actorUserId) {
        try {
          await activity.append(normalizedCompanyId, {
            actor: input.actorUserId,
            action: "inventory.warehouse_created",
            target: `warehouse:${created.id}`,
            targetId: created.id,
            targetName: input.name,
          });
        } catch {
          // Activity log is best-effort; warehouse write already succeeded.
        }
      }

      return created.id;
    },

    mapWarehouse,
  };
}
