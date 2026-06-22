import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { MotorImportJob, MotorImportJobProgress } from "@/domain/motor-import";
import {
  hasMotorImportRollbackWork,
  rollbackMotorImportPartialApply,
} from "@/application/use-cases/motors/rollback-motor-import-partial.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { normalizeCompanyId } from "@/lib/company-id";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { normalizeImportEngineRows } from "@/lib/motors/import/normalize-engine-rows";
import { MotorImportPreviewRow } from "@/lib/motors/import/types";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";

const COLLECTION = "motorImports";
export const MOTOR_IMPORT_ROWS_INLINE_LIMIT = 100;
const ROW_BATCH_SIZE = 400;

async function appendMotorImportActivityLog(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db
      .collection("companies")
      .doc(normalizeCompanyId(companyId))
      .collection("activityLogs")
      .add({
        ...payload,
        timestamp: FieldValue.serverTimestamp(),
      });
  } catch {
    // Activity log is best-effort; import must not fail if logging fails.
  }
}

function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as T;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForFirestore(item)) as T;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    result[key] = sanitizeForFirestore(child);
  }
  return result as T;
}

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
  return { ...config, previewRows: config.previewRows ?? [] };
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

function mapMotorImportJob(id: string, data: Record<string, unknown>): MotorImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    status: data.status as MotorImportJob["status"],
    progress: data.progress as MotorImportJobProgress | undefined,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    quickImport: data.quickImport === true,
    autoApply: data.autoApply === true,
    processAttempts: typeof data.processAttempts === "number" ? data.processAttempts : undefined,
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
    specificSheetsPreview: (data.specificSheetsPreview as MotorImportJob["specificSheetsPreview"]) ?? [],
    rowCount: typeof data.rowCount === "number" ? data.rowCount : undefined,
    aiNotes: typeof data.aiNotes === "string" ? data.aiNotes : undefined,
    appliedSummary: data.appliedSummary as MotorImportJob["appliedSummary"],
    rollbackSnapshot: data.rollbackSnapshot as MotorImportJob["rollbackSnapshot"],
    rowsStoredInSubcollection: data.rowsStoredInSubcollection === true,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt),
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
}

async function writeEngineRowsToSubcollection(jobId: string, rows: MotorImportPreviewRow[]) {
  const db = getAdminFirestore();
  for (let offset = 0; offset < rows.length; offset += ROW_BATCH_SIZE) {
    const batch = db.batch();
    const chunk = rows.slice(offset, offset + ROW_BATCH_SIZE);
    for (const row of chunk) {
      const ref = db.collection(COLLECTION).doc(jobId).collection("rows").doc(row.rowKey);
      batch.set(ref, serializeEngineRowForFirestore(row));
    }
    await batch.commit();
  }
}

export async function uploadMotorImportFile(params: {
  companyId: string;
  jobId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  const safeName = params.fileName.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120);
  const storagePath = `motor-imports/${normalizeCompanyId(params.companyId)}/${params.jobId}/${safeName}`;
  const bucket = await resolveAdminStorageBucket();
  await bucket.file(storagePath).save(params.buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    resumable: false,
  });
  return storagePath;
}

export async function downloadMotorImportFile(storagePath: string): Promise<Buffer> {
  const bucket = await resolveAdminStorageBucket();
  const [buffer] = await bucket.file(storagePath).download();
  return buffer;
}

export async function createQueuedMotorImportJob(params: {
  jobId: string;
  companyId: string;
  sourceFileName: string;
  storagePath: string;
  createdByUserId: string;
  autoApply?: boolean;
}): Promise<string> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(params.jobId);
  await ref.set({
    companyId: normalizeCompanyId(params.companyId),
    status: "queued",
    sourceFileName: params.sourceFileName,
    storagePath: params.storagePath,
    autoApply: params.autoApply ?? true,
    sheetConfigs: [],
    columnMappings: {},
    engineRows: [],
    rowsStoredInSubcollection: false,
    rowCount: 0,
    stats: {
      totalEngineRows: 0,
      validEngineRows: 0,
      duplicates: 0,
      errors: 0,
      warnings: 0,
      specificSheets: 0,
    },
    progress: {
      phase: "analyze",
      percent: 1,
      message: "Файл загружен, ставим в очередь…",
    },
    processAttempts: 0,
    createdByUserId: params.createdByUserId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await appendMotorImportActivityLog(params.companyId, {
    companyId: normalizeCompanyId(params.companyId),
    actor: params.createdByUserId,
    action: "inventory.motor_import_started",
    target: `motorImport:${ref.id}`,
    targetId: ref.id,
    metadata: { fileName: params.sourceFileName },
  });

  return ref.id;
}

export async function getMotorImportJobAdmin(jobId: string): Promise<MotorImportJob | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(jobId).get();
  if (!snap.exists) return null;
  return mapMotorImportJob(snap.id, snap.data() as Record<string, unknown>);
}

export async function claimMotorImportJobForProcessing(jobId: string): Promise<MotorImportJob | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(jobId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as Record<string, unknown>;
    const status = String(data.status ?? "");
    if (status === "cancelled") {
      return mapMotorImportJob(snap.id, data);
    }
    if (status !== "queued" && status !== "analyzing") {
      return mapMotorImportJob(snap.id, data);
    }

    tx.update(ref, {
      status: "analyzing",
      processAttempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return mapMotorImportJob(snap.id, { ...data, status: "analyzing" });
  });
}

export async function claimMotorImportJobForApply(
  jobId: string,
): Promise<{ job: MotorImportJob; claimed: boolean } | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(jobId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as Record<string, unknown>;
    const status = String(data.status ?? "");
    const job = mapMotorImportJob(snap.id, data);

    if (status === "completed" || status === "failed" || status === "applying" || status === "cancelled") {
      return { job, claimed: false };
    }

    if (status !== "preview") {
      return { job, claimed: false };
    }

    tx.update(ref, {
      status: "applying",
      updatedAt: FieldValue.serverTimestamp(),
      progress: {
        phase: "apply",
        percent: 0,
        message: "Загружаем моторы в базу…",
      },
    });

    return {
      job: mapMotorImportJob(snap.id, { ...data, status: "applying" }),
      claimed: true,
    };
  });
}

async function deleteEngineRowsSubcollection(jobId: string) {
  const db = getAdminFirestore();
  const col = db.collection(COLLECTION).doc(jobId).collection("rows");
  while (true) {
    const snap = await col.limit(ROW_BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export async function updateMotorImportJobMappings(
  jobId: string,
  sheetConfigs: SheetImportConfig[],
  columnMappings: Record<string, SheetColumnMapping>,
) {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(jobId).update({
    sheetConfigs: sheetConfigs.map((config) =>
      sanitizeForFirestore(serializeSheetConfigForFirestore(config)),
    ),
    columnMappings: sanitizeForFirestore(columnMappings),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function resetStuckMotorImportApply(jobId: string): Promise<boolean> {
  const job = await getMotorImportJobAdmin(jobId);
  if (!job || job.status !== "applying") return false;
  const ageMs = Date.now() - (job.updatedAt?.getTime() ?? Date.now());
  const percent = job.progress?.percent ?? 0;
  if (ageMs < 45_000 || percent >= 15) return false;
  await updateMotorImportJobStatus(jobId, "preview");
  return true;
}
export async function updateMotorImportJobProgress(
  jobId: string,
  progress: MotorImportJobProgress,
  status?: MotorImportJob["status"],
) {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(jobId).update({
    progress,
    ...(status ? { status } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function completeMotorImportAnalyze(params: {
  jobId: string;
  companyId: string;
  sourceFileName?: string;
  sheetConfigs: SheetImportConfig[];
  columnMappings: Record<string, SheetColumnMapping>;
  engineRows: MotorImportPreviewRow[];
  stats: MotorImportJob["stats"];
  quickImport: boolean;
  aiNotes?: string;
  specificSheetsPreview?: MotorImportJob["specificSheetsPreview"];
}) {
  const db = getAdminFirestore();
  const storeInSubcollection = params.engineRows.length > MOTOR_IMPORT_ROWS_INLINE_LIMIT;

  if (storeInSubcollection) {
    await writeEngineRowsToSubcollection(params.jobId, params.engineRows);
  }

  await db.collection(COLLECTION).doc(params.jobId).update({
    status: "preview",
    quickImport: params.quickImport,
    sheetConfigs: params.sheetConfigs.map((config) =>
      sanitizeForFirestore(serializeSheetConfigForFirestore(config)),
    ),
    columnMappings: sanitizeForFirestore(params.columnMappings),
    engineRows: storeInSubcollection ? [] : params.engineRows.map(serializeEngineRowForFirestore),
    rowsStoredInSubcollection: storeInSubcollection,
    rowCount: params.engineRows.length,
    stats: params.stats,
    specificSheetsPreview: params.specificSheetsPreview ?? [],
    progress: {
      phase: "analyze",
      percent: 100,
      message: "Готово к проверке",
    },
    aiNotes: params.aiNotes ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function loadMotorImportEngineRowsAdmin(job: MotorImportJob): Promise<MotorImportPreviewRow[]> {
  if (!job.rowsStoredInSubcollection) {
    return normalizeImportEngineRows(job.engineRows);
  }
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(job.id).collection("rows").get();
  return normalizeImportEngineRows(snap.docs.map((item) => item.data() as MotorImportPreviewRow));
}

export async function updateMotorImportJobStatus(
  jobId: string,
  status: MotorImportJob["status"],
  errorMessage?: string,
) {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(jobId).update({
    status,
    errorMessage: errorMessage ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function persistMotorImportRollbackSnapshot(
  jobId: string,
  snapshot: MotorImportJob["rollbackSnapshot"],
) {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(jobId).update({
    rollbackSnapshot: snapshot ?? {
      createdMotorIds: [],
      updatedMotorIds: [],
      createdBrandIds: [],
      createdEngineIds: [],
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function cancelMotorImportJobAdmin(jobId: string): Promise<MotorImportJob | null> {
  const job = await getMotorImportJobAdmin(jobId);
  if (!job) return null;
  if (job.status === "completed" || job.status === "cancelled") return job;

  const snapshot = job.rollbackSnapshot;
  const shouldRollback = hasMotorImportRollbackWork(snapshot);

  await updateMotorImportJobStatus(jobId, "cancelled", "Отменён пользователем");

  if (shouldRollback && snapshot && job.createdByUserId) {
    await rollbackMotorImportPartialApply({
      uid: job.createdByUserId,
      snapshot,
    });
    await persistMotorImportRollbackSnapshot(jobId, {
      createdMotorIds: [],
      updatedMotorIds: snapshot.updatedMotorIds ?? [],
      createdBrandIds: [],
      createdEngineIds: [],
    });
  }

  return getMotorImportJobAdmin(jobId);
}

export async function isMotorImportJobCancelledAdmin(jobId: string): Promise<boolean> {
  const job = await getMotorImportJobAdmin(jobId);
  return job?.status === "cancelled";
}

export async function markMotorImportJobCompleted(
  jobId: string,
  companyId: string,
  actorUserId: string,
  summary: MotorImportJob["appliedSummary"],
  rollbackSnapshot?: MotorImportJob["rollbackSnapshot"],
) {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(jobId).update({
    status: "completed",
    appliedSummary: summary,
    rollbackSnapshot: rollbackSnapshot ?? {
      createdMotorIds: [],
      updatedMotorIds: [],
      createdBrandIds: [],
      createdEngineIds: [],
    },
    progress: {
      phase: "apply",
      percent: 100,
      message: "Импорт завершён",
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  await appendMotorImportActivityLog(companyId, {
    companyId: normalizeCompanyId(companyId),
    actor: actorUserId,
    action: "inventory.motor_imported",
    target: `motorImport:${jobId}`,
    targetId: jobId,
    metadata: {
      imported: summary?.imported ?? null,
      updated: summary?.updated ?? null,
    },
  });
}

export async function persistMotorImportEngineRows(
  jobId: string,
  engineRows: MotorImportPreviewRow[],
  stats: MotorImportJob["stats"],
) {
  const db = getAdminFirestore();
  const storeInSubcollection = engineRows.length > MOTOR_IMPORT_ROWS_INLINE_LIMIT;

  await db.collection(COLLECTION).doc(jobId).update({
    engineRows: storeInSubcollection ? [] : engineRows.map(serializeEngineRowForFirestore),
    rowsStoredInSubcollection: storeInSubcollection,
    rowCount: engineRows.length,
    stats,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (storeInSubcollection) {
    await deleteEngineRowsSubcollection(jobId);
    await writeEngineRowsToSubcollection(jobId, engineRows);
  }
}

export function assertMotorImportCompanyAccess(job: MotorImportJob, companyId: string) {
  if (normalizeCompanyId(job.companyId) !== normalizeCompanyId(companyId)) {
    throw new Error("Import job belongs to another company");
  }
}
