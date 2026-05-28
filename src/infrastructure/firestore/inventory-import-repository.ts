import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { InventoryImportJob, InventoryImportRow } from "@/domain/inventory-import";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

const COLLECTION = "inventoryImports";

function mapImportJob(id: string, data: Record<string, unknown>): InventoryImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    status: data.status as InventoryImportJob["status"],
    sourceFileName: typeof data.sourceFileName === "string" ? data.sourceFileName : undefined,
    columnMapping: (data.columnMapping as Record<string, string>) ?? {},
    rows: (data.rows as InventoryImportRow[]) ?? [],
    stats: (data.stats as InventoryImportJob["stats"]) ?? {
      total: 0,
      valid: 0,
      duplicates: 0,
      errors: 0,
    },
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
}

export type InventoryImportRepository = ReturnType<typeof createInventoryImportRepository>;

export function createInventoryImportRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, COLLECTION);

  return {
    async createJob(input: {
      companyId: string;
      sourceFileName?: string;
      columnMapping: Record<string, string>;
      rows: InventoryImportRow[];
      stats: InventoryImportJob["stats"];
      createdByUserId: string;
    }): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const created = await addDoc(ref, {
        companyId: normalizedCompanyId,
        status: "preview",
        sourceFileName: input.sourceFileName,
        columnMapping: input.columnMapping,
        rows: input.rows,
        stats: input.stats,
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return created.id;
    },

    async updateStatus(
      jobId: string,
      status: InventoryImportJob["status"],
      errorMessage?: string,
    ): Promise<void> {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: serverTimestamp(),
      });
    },

    async markCompleted(jobId: string, companyId: string, actorUserId: string): Promise<void> {
      await this.updateStatus(jobId, "completed");
      await activity.append(normalizeCompanyId(companyId), {
        actor: actorUserId,
        action: "inventory.import_completed",
        target: `inventoryImport:${jobId}`,
        targetId: jobId,
      });
    },

    mapImportJob,
  };
}
