import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { InventoryImportJob, InventoryImportRow } from "@/domain/inventory-import";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { ImportPhase, ImportValueSource } from "@/lib/warehouse/import/types";

const COLLECTION = "inventoryImports";
export const IMPORT_ROWS_INLINE_LIMIT = 100;
const ROW_BATCH_SIZE = 400;

function mapImportJob(id: string, data: Record<string, unknown>): InventoryImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    status: data.status as InventoryImportJob["status"],
    phase: data.phase as InventoryImportJob["phase"],
    progress: data.progress as InventoryImportJob["progress"],
    sourceFileName: typeof data.sourceFileName === "string" ? data.sourceFileName : undefined,
    columnMapping: (data.columnMapping as Record<string, string>) ?? {},
    columnMappingSource: data.columnMappingSource as ImportValueSource | undefined,
    rows: (data.rows as InventoryImportRow[]) ?? [],
    stats: (data.stats as InventoryImportJob["stats"]) ?? {
      total: 0,
      valid: 0,
      duplicates: 0,
      errors: 0,
    },
    rollbackMovementIds: Array.isArray(data.rollbackMovementIds)
      ? data.rollbackMovementIds.map(String)
      : undefined,
    appliedSummary:
      data.appliedSummary as InventoryImportJob["appliedSummary"],
    rowsStoredInSubcollection: data.rowsStoredInSubcollection === true,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
}

async function writeRowsToSubcollection(jobId: string, rows: InventoryImportRow[]) {
  const db = getFirestoreDb();
  for (let offset = 0; offset < rows.length; offset += ROW_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = rows.slice(offset, offset + ROW_BATCH_SIZE);
    for (const row of chunk) {
      const rowRef = doc(db, COLLECTION, jobId, "rows", String(row.rowIndex));
      batch.set(rowRef, row);
    }
    await batch.commit();
  }
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
      columnMappingSource?: ImportValueSource;
      rows: InventoryImportRow[];
      stats: InventoryImportJob["stats"];
      createdByUserId: string;
    }): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const storeInSubcollection = input.rows.length > IMPORT_ROWS_INLINE_LIMIT;
      const created = await addDoc(ref, {
        companyId: normalizedCompanyId,
        status: "preview",
        phase: "preview",
        sourceFileName: input.sourceFileName,
        columnMapping: input.columnMapping,
        columnMappingSource: input.columnMappingSource ?? "rules",
        rows: storeInSubcollection ? [] : input.rows,
        rowsStoredInSubcollection: storeInSubcollection,
        rowCount: input.rows.length,
        stats: input.stats,
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (storeInSubcollection) {
        await writeRowsToSubcollection(created.id, input.rows);
      }

      return created.id;
    },

    async getById(jobId: string): Promise<InventoryImportJob | null> {
      const snapshot = await getDoc(doc(db, COLLECTION, jobId));
      if (!snapshot.exists()) return null;
      return mapImportJob(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async loadRows(job: InventoryImportJob): Promise<InventoryImportRow[]> {
      if (!job.rowsStoredInSubcollection) return job.rows;
      const snapshot = await getDocs(
        query(collection(db, COLLECTION, job.id, "rows"), orderBy("rowIndex", "asc")),
      );
      return snapshot.docs.map((item) => item.data() as InventoryImportRow);
    },

    subscribe(
      companyId: string,
      onData: (jobs: InventoryImportJob[]) => void,
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
            snapshot.docs.map((item) => mapImportJob(item.id, item.data() as Record<string, unknown>)),
          );
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
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

    async updateProgress(
      jobId: string,
      progress: {
        phase: ImportPhase;
        current: number;
        total: number;
        percent: number;
        message?: string;
      },
    ): Promise<void> {
      await updateDoc(doc(db, COLLECTION, jobId), {
        phase: progress.phase,
        progress,
        updatedAt: serverTimestamp(),
      });
    },

    async appendAuditEvent(
      jobId: string,
      event: {
        actor: string;
        action: string;
        metadata?: Record<string, string | number | boolean | null>;
      },
    ): Promise<void> {
      await addDoc(collection(db, COLLECTION, jobId, "audit"), {
        ...event,
        createdAt: serverTimestamp(),
      });
    },

    async markCompleted(
      jobId: string,
      companyId: string,
      actorUserId: string,
      summary?: { applied: number; failed: number; rollbackMovementIds?: string[] },
    ): Promise<void> {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status: "completed",
        phase: "done",
        rollbackMovementIds: summary?.rollbackMovementIds ?? [],
        appliedSummary: {
          applied: summary?.applied ?? 0,
          failed: summary?.failed ?? 0,
        },
        updatedAt: serverTimestamp(),
      });
      await activity.append(normalizeCompanyId(companyId), {
        actor: actorUserId,
        action: "inventory.import_completed",
        target: `inventoryImport:${jobId}`,
        targetId: jobId,
        metadata: {
          applied: summary?.applied ?? null,
          failed: summary?.failed ?? null,
        },
      });
    },

    async markRolledBack(
      jobId: string,
      companyId: string,
      actorUserId: string,
      summary: { reversed: number; failed: number },
    ): Promise<void> {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status: "rolled_back",
        phase: "done",
        rollbackSummary: summary,
        updatedAt: serverTimestamp(),
      });
      await activity.append(normalizeCompanyId(companyId), {
        actor: actorUserId,
        action: "inventory.import_rolled_back",
        target: `inventoryImport:${jobId}`,
        targetId: jobId,
        metadata: {
          reversed: summary.reversed,
          failed: summary.failed,
        },
      });
    },

    mapImportJob,
  };
}
