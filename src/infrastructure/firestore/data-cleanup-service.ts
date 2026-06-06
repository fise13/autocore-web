import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

import { normalizeCompanyId } from "@/lib/company-id";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

const BATCH_SIZE = 400;

async function deleteDocsInBatches(refs: Array<ReturnType<typeof doc>>): Promise<number> {
  const db = getFirestoreDb();
  let deleted = 0;

  for (let index = 0; index < refs.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = refs.slice(index, index + BATCH_SIZE);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

export type DataCleanupService = ReturnType<typeof createDataCleanupService>;

export function createDataCleanupService() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();

  return {
    async deleteAllAccounting(companyId: string, actorId: string): Promise<number> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const refs: Array<ReturnType<typeof doc>> = [];

      for (const collectionName of ["financialOperations", "operations"] as const) {
        const snapshot = await getDocs(
          query(collection(db, collectionName), where("companyId", "==", normalizedCompanyId)),
        );
        refs.push(...snapshot.docs.map((item) => item.ref));
      }

      const deleted = await deleteDocsInBatches(refs);
      await activity.append(normalizedCompanyId, {
        actor: actorId,
        action: "accounting.operations_cleared",
        target: `company:${normalizedCompanyId}`,
        metadata: { deleted },
      });
      return deleted;
    },

    async deleteAllMotors(uid: string, companyId: string, actorId: string): Promise<number> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const refs = new Map<string, ReturnType<typeof doc>>();

      const userMotors = await getDocs(collection(db, "users", uid, "motors"));
      for (const item of userMotors.docs) {
        const data = item.data() as Record<string, unknown>;
        const scopedCompanyId = String(data.companyId ?? normalizedCompanyId);
        if (!scopedCompanyId || scopedCompanyId === normalizedCompanyId || !data.companyId) {
          refs.set(item.ref.path, item.ref);
        }
      }

      const legacyMotors = await getDocs(
        query(collection(db, "motors"), where("companyId", "==", normalizedCompanyId)),
      );
      for (const item of legacyMotors.docs) {
        refs.set(item.ref.path, item.ref);
      }

      try {
        const groupedMotors = await getDocs(
          query(collectionGroup(db, "motors"), where("companyId", "==", normalizedCompanyId)),
        );
        for (const item of groupedMotors.docs) {
          if (item.ref.path.startsWith(`users/${uid}/motors/`)) {
            refs.set(item.ref.path, item.ref);
          }
        }
      } catch {
        // collectionGroup may be unavailable for some roles; user-scoped delete still runs.
      }

      const deleted = await deleteDocsInBatches([...refs.values()]);
      await activity.append(normalizedCompanyId, {
        actor: actorId,
        action: "inventory.motors_cleared",
        target: `company:${normalizedCompanyId}`,
        metadata: { deleted },
      });
      return deleted;
    },

    async deleteAllSpecifics(companyId: string, actorId: string): Promise<number> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const refs: Array<ReturnType<typeof doc>> = [];

      const records = await getDocs(
        query(collection(db, "specificRecords"), where("companyId", "==", normalizedCompanyId)),
      );
      refs.push(...records.docs.map((item) => item.ref));

      const categories = await getDocs(
        query(collection(db, "specificCategories"), where("companyId", "==", normalizedCompanyId)),
      );
      refs.push(...categories.docs.map((item) => item.ref));

      const deleted = await deleteDocsInBatches(refs);
      await activity.append(normalizedCompanyId, {
        actor: actorId,
        action: "inventory.specifics_cleared",
        target: `company:${normalizedCompanyId}`,
        metadata: { deleted },
      });
      return deleted;
    },

    async deleteAllWarehouse(companyId: string, actorId: string): Promise<number> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const refs: Array<ReturnType<typeof doc>> = [];

      const importSnapshot = await getDocs(
        query(collection(db, "inventoryImports"), where("companyId", "==", normalizedCompanyId)),
      );
      for (const importDoc of importSnapshot.docs) {
        const rows = await getDocs(collection(importDoc.ref, "rows"));
        refs.push(...rows.docs.map((item) => item.ref));
        const audit = await getDocs(collection(importDoc.ref, "audit"));
        refs.push(...audit.docs.map((item) => item.ref));
        refs.push(importDoc.ref);
      }

      for (const collectionName of [
        "inventoryItems",
        "inventoryMovements",
        "inventoryStockLevels",
        "inventoryReservations",
        "barcodeMappings",
        "warehouses",
        "suppliers",
      ] as const) {
        const snapshot = await getDocs(
          query(collection(db, collectionName), where("companyId", "==", normalizedCompanyId)),
        );
        refs.push(...snapshot.docs.map((item) => item.ref));
      }

      const deleted = await deleteDocsInBatches(refs);
      await activity.append(normalizedCompanyId, {
        actor: actorId,
        action: "inventory.warehouse_cleared",
        target: `company:${normalizedCompanyId}`,
        metadata: { deleted },
      });
      return deleted;
    },
  };
}
