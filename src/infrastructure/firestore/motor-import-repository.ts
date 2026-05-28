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

import { MotorImportJob } from "@/domain/motor-import";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { MotorImportPreviewRow } from "@/lib/motors/import/types";

const COLLECTION = "motorImports";
export const MOTOR_IMPORT_ROWS_INLINE_LIMIT = 100;
const ROW_BATCH_SIZE = 400;

/** Firestore rejects `undefined` anywhere in the document tree. */
function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) {
    return null as T;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }
  if ("_methodName" in (value as object)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    result[key] = sanitizeForFirestore(child);
  }
  return result as T;
}

/** Firestore rejects nested arrays; sheet configs only need scalar fields for job resume. */
function serializeSheetConfigForFirestore(config: SheetImportConfig) {
  const { previewRows: _previewRows, ...rest } = config;
  return rest;
}

function serializeEngineRowForFirestore(row: MotorImportPreviewRow) {
  return sanitizeForFirestore({
    ...row,
    arrivalDate: row.arrivalDate ?? null,
    soldDate: row.soldDate ?? null,
  });
}

function restoreSheetConfigFromFirestore(
  config: Omit<SheetImportConfig, "previewRows"> & { previewRows?: string[][] },
): SheetImportConfig {
  return {
    ...config,
    previewRows: config.previewRows ?? [],
  };
}

function mapMotorImportJob(id: string, data: Record<string, unknown>): MotorImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    status: data.status as MotorImportJob["status"],
    sourceFileName: typeof data.sourceFileName === "string" ? data.sourceFileName : undefined,
    sheetConfigs: ((data.sheetConfigs as Omit<SheetImportConfig, "previewRows">[]) ?? []).map(
      restoreSheetConfigFromFirestore,
    ),
    columnMappings: (data.columnMappings as MotorImportJob["columnMappings"]) ?? {},
    engineRows: (data.engineRows as MotorImportPreviewRow[]) ?? [],
    stats: (data.stats as MotorImportJob["stats"]) ?? {
      totalEngineRows: 0,
      validEngineRows: 0,
      duplicates: 0,
      errors: 0,
      warnings: 0,
      specificSheets: 0,
    },
    appliedSummary: data.appliedSummary as MotorImportJob["appliedSummary"],
    rollbackSnapshot: data.rollbackSnapshot as MotorImportJob["rollbackSnapshot"],
    rowsStoredInSubcollection: data.rowsStoredInSubcollection === true,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
}

async function writeEngineRowsToSubcollection(jobId: string, rows: MotorImportPreviewRow[]) {
  const db = getFirestoreDb();
  for (let offset = 0; offset < rows.length; offset += ROW_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = rows.slice(offset, offset + ROW_BATCH_SIZE);
    for (const row of chunk) {
      batch.set(doc(db, COLLECTION, jobId, "rows", row.rowKey), serializeEngineRowForFirestore(row));
    }
    await batch.commit();
  }
}

export type MotorImportRepository = ReturnType<typeof createMotorImportRepository>;

export function createMotorImportRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, COLLECTION);

  return {
    async createJob(input: Omit<MotorImportJob, "id" | "createdAt" | "updatedAt" | "status"> & {
      createdByUserId: string;
    }): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const storeInSubcollection = input.engineRows.length > MOTOR_IMPORT_ROWS_INLINE_LIMIT;
      const created = await addDoc(ref, {
        companyId: normalizedCompanyId,
        status: "preview",
        sourceFileName: input.sourceFileName ?? null,
        sheetConfigs: input.sheetConfigs.map((config) =>
          sanitizeForFirestore(serializeSheetConfigForFirestore(config)),
        ),
        columnMappings: sanitizeForFirestore(input.columnMappings),
        engineRows: storeInSubcollection
          ? []
          : input.engineRows.map(serializeEngineRowForFirestore),
        rowsStoredInSubcollection: storeInSubcollection,
        rowCount: input.engineRows.length,
        stats: input.stats,
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (storeInSubcollection) {
        await writeEngineRowsToSubcollection(created.id, input.engineRows);
      }
      await activity.append(normalizedCompanyId, {
        actor: input.createdByUserId,
        action: "inventory.motor_import_started",
        target: `motorImport:${created.id}`,
        targetId: created.id,
        metadata: {
          fileName: input.sourceFileName ?? null,
          totalRows: input.stats.totalEngineRows,
        },
      });
      return created.id;
    },

    async getById(jobId: string): Promise<MotorImportJob | null> {
      const snapshot = await getDoc(doc(db, COLLECTION, jobId));
      if (!snapshot.exists()) return null;
      return mapMotorImportJob(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async loadEngineRows(job: MotorImportJob): Promise<MotorImportPreviewRow[]> {
      if (!job.rowsStoredInSubcollection) return job.engineRows;
      const snapshot = await getDocs(collection(db, COLLECTION, job.id, "rows"));
      return snapshot.docs.map((item) => item.data() as MotorImportPreviewRow);
    },

    subscribe(companyId: string, onData: (jobs: MotorImportJob[]) => void, onError?: (error: Error) => void) {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        orderBy("createdAt", "desc"),
        limit(20),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapMotorImportJob(item.id, item.data() as Record<string, unknown>)));
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async updateStatus(jobId: string, status: MotorImportJob["status"], errorMessage?: string) {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: serverTimestamp(),
      });
    },

    async markCompleted(
      jobId: string,
      companyId: string,
      actorUserId: string,
      summary: MotorImportJob["appliedSummary"],
      rollbackSnapshot?: MotorImportJob["rollbackSnapshot"],
    ) {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status: "completed",
        appliedSummary: summary,
        rollbackSnapshot: rollbackSnapshot ?? { createdMotorIds: [], updatedMotorIds: [] },
        updatedAt: serverTimestamp(),
      });
      await activity.append(normalizeCompanyId(companyId), {
        actor: actorUserId,
        action: "inventory.motor_imported",
        target: `motorImport:${jobId}`,
        targetId: jobId,
        metadata: {
          imported: summary?.imported ?? null,
          updated: summary?.updated ?? null,
        },
      });
    },

    async appendAuditEvent(
      jobId: string,
      event: { actor: string; action: string; metadata?: Record<string, string | number | boolean | null> },
    ) {
      await addDoc(collection(db, COLLECTION, jobId, "audit"), {
        ...event,
        createdAt: serverTimestamp(),
      });
    },

    async markRolledBack(jobId: string, companyId: string, actorUserId: string) {
      await updateDoc(doc(db, COLLECTION, jobId), {
        status: "rolled_back",
        updatedAt: serverTimestamp(),
      });
      await activity.append(normalizeCompanyId(companyId), {
        actor: actorUserId,
        action: "inventory.motor_import_rolled_back",
        target: `motorImport:${jobId}`,
        targetId: jobId,
      });
    },
  };
}
