import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  EMPTY_IMPORT_BATCH_COUNTS,
  IMPORT_BATCH_FILES_SUBCOLLECTION,
  IMPORT_BATCH_ROWS_SUBCOLLECTION,
  IMPORT_BATCH_TTL_MS,
  IMPORT_BATCHES_COLLECTION,
  type ImportBatch,
  type ImportBatchAiStatus,
  type ImportBatchCounts,
  type ImportBatchFile,
  type ImportBatchFileKind,
  type ImportBatchFileStatus,
  type ImportBatchStatus,
  type ImportBatchTarget,
  type ImportSuggestedRow,
} from "@/domain/import-batch";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildFirebaseStorageDownloadUrl } from "@/lib/company/upload-company-logo-utils";
import { createDocumentImportPreview } from "@/lib/document-import/create-preview-image.server";

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function mapCounts(raw: unknown): ImportBatchCounts {
  if (!raw || typeof raw !== "object") return { ...EMPTY_IMPORT_BATCH_COUNTS };
  const data = raw as Record<string, unknown>;
  return {
    files: typeof data.files === "number" ? data.files : 0,
    filesReady: typeof data.filesReady === "number" ? data.filesReady : 0,
    filesFailed: typeof data.filesFailed === "number" ? data.filesFailed : 0,
    rows: typeof data.rows === "number" ? data.rows : 0,
    rowsAccepted: typeof data.rowsAccepted === "number" ? data.rowsAccepted : 0,
    rowsLowConfidence: typeof data.rowsLowConfidence === "number" ? data.rowsLowConfidence : 0,
  };
}

export function mapImportBatch(id: string, data: Record<string, unknown>): ImportBatch {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    createdBy: String(data.createdBy ?? ""),
    target: (data.target as ImportBatchTarget) ?? "motors",
    status: (data.status as ImportBatchStatus) ?? "collecting",
    aiStatus: (data.aiStatus as ImportBatchAiStatus) ?? "idle",
    title: typeof data.title === "string" ? data.title : undefined,
    counts: mapCounts(data.counts),
    expiresAt: toDate(data.expiresAt, new Date(Date.now() + IMPORT_BATCH_TTL_MS)),
    appliedMotorIds: Array.isArray(data.appliedMotorIds)
      ? data.appliedMotorIds.map(String)
      : undefined,
    error: typeof data.error === "string" ? data.error : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mapImportBatchFile(id: string, data: Record<string, unknown>): ImportBatchFile {
  return {
    id,
    batchId: String(data.batchId ?? ""),
    companyId: String(data.companyId ?? ""),
    kind: (data.kind as ImportBatchFileKind) ?? "other",
    status: (data.status as ImportBatchFileStatus) ?? "ready",
    contentType: String(data.contentType ?? "application/octet-stream"),
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    byteSize: typeof data.byteSize === "number" ? data.byteSize : undefined,
    storagePath: String(data.storagePath ?? ""),
    downloadUrl: String(data.downloadUrl ?? ""),
    previewStoragePath:
      typeof data.previewStoragePath === "string" ? data.previewStoragePath : null,
    previewDownloadUrl:
      typeof data.previewDownloadUrl === "string" ? data.previewDownloadUrl : null,
    width: typeof data.width === "number" ? data.width : undefined,
    height: typeof data.height === "number" ? data.height : undefined,
    ocrText: typeof data.ocrText === "string" ? data.ocrText : null,
    error: typeof data.error === "string" ? data.error : null,
    documentImportId: typeof data.documentImportId === "string" ? data.documentImportId : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mapImportSuggestedRow(id: string, data: Record<string, unknown>): ImportSuggestedRow {
  return {
    id,
    batchId: String(data.batchId ?? ""),
    companyId: String(data.companyId ?? ""),
    sourceFileId: typeof data.sourceFileId === "string" ? data.sourceFileId : null,
    selected: data.selected !== false,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    serialCode: String(data.serialCode ?? ""),
    brandName: String(data.brandName ?? ""),
    engineCode: String(data.engineCode ?? ""),
    configuration: String(data.configuration ?? ""),
    notes: String(data.notes ?? ""),
    quantity: typeof data.quantity === "number" && data.quantity > 0 ? data.quantity : 1,
    transmission: String(data.transmission ?? ""),
    vin: typeof data.vin === "string" ? data.vin : undefined,
    price: typeof data.price === "number" ? data.price : null,
    compatibility: typeof data.compatibility === "string" ? data.compatibility : undefined,
    errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
    warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
    summary: String(data.summary ?? ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

async function uploadBytes(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(params.storagePath);
  const downloadToken = randomUUID();

  await file.save(params.buffer, {
    contentType: params.contentType,
    metadata: {
      cacheControl: "private, max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return {
    storagePath: params.storagePath,
    downloadUrl: buildFirebaseStorageDownloadUrl(bucket.name, params.storagePath, downloadToken),
  };
}

function extensionFor(contentType: string, fileName?: string): string {
  const mime = contentType.trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/csv": "csv",
    "text/plain": "csv",
  };
  if (map[mime]) return map[mime]!;
  const fromName = fileName?.split(".").pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  return "bin";
}

export function detectImportFileKind(contentType: string, fileName?: string): ImportBatchFileKind {
  const mime = contentType.trim().toLowerCase();
  const name = (fileName ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv" ||
    mime === "text/plain" ||
    /\.(xlsx|xls|csv)$/.test(name)
  ) {
    return "spreadsheet";
  }
  return "other";
}

function batchRef(batchId: string) {
  return getAdminFirestore().collection(IMPORT_BATCHES_COLLECTION).doc(batchId);
}

function filesCol(batchId: string) {
  return batchRef(batchId).collection(IMPORT_BATCH_FILES_SUBCOLLECTION);
}

function rowsCol(batchId: string) {
  return batchRef(batchId).collection(IMPORT_BATCH_ROWS_SUBCOLLECTION);
}

export async function createImportBatchAdmin(params: {
  companyId: string;
  createdBy: string;
  target?: ImportBatchTarget;
  title?: string;
}): Promise<ImportBatch> {
  const db = getAdminFirestore();
  const companyId = normalizeCompanyId(params.companyId);
  const docRef = db.collection(IMPORT_BATCHES_COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + IMPORT_BATCH_TTL_MS));

  await docRef.set({
    companyId,
    createdBy: params.createdBy,
    target: params.target ?? "motors",
    status: "collecting",
    aiStatus: "idle",
    title: params.title ?? null,
    counts: { ...EMPTY_IMPORT_BATCH_COUNTS },
    expiresAt,
    error: null,
    createdAt: now,
    updatedAt: now,
  });

  const snap = await docRef.get();
  return mapImportBatch(docRef.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function getImportBatchAdmin(
  companyId: string,
  batchId: string,
): Promise<ImportBatch | null> {
  const snap = await batchRef(batchId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
    return null;
  }
  return mapImportBatch(snap.id, data);
}

export async function listImportBatchesAdmin(
  companyId: string,
  max = 40,
): Promise<ImportBatch[]> {
  // Avoid composite index: filter only, sort in memory.
  const snap = await getAdminFirestore()
    .collection(IMPORT_BATCHES_COLLECTION)
    .where("companyId", "==", normalizeCompanyId(companyId))
    .limit(Math.max(max * 3, 80))
    .get();

  return snap.docs
    .map((entry) => mapImportBatch(entry.id, entry.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, max);
}

export async function updateImportBatchAdmin(
  batchId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await batchRef(batchId).set(
    { ...patch, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function listImportBatchFilesAdmin(batchId: string): Promise<ImportBatchFile[]> {
  const snap = await filesCol(batchId).get();
  return snap.docs
    .map((entry) => mapImportBatchFile(entry.id, entry.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listImportSuggestedRowsAdmin(batchId: string): Promise<ImportSuggestedRow[]> {
  const snap = await rowsCol(batchId).get();
  return snap.docs
    .map((entry) => mapImportSuggestedRow(entry.id, entry.data() as Record<string, unknown>))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getImportBatchFileAdmin(
  batchId: string,
  fileId: string,
): Promise<ImportBatchFile | null> {
  const snap = await filesCol(batchId).doc(fileId).get();
  if (!snap.exists) return null;
  return mapImportBatchFile(snap.id, snap.data() as Record<string, unknown>);
}

async function recomputeBatchCounts(batchId: string): Promise<ImportBatchCounts> {
  const [files, rows] = await Promise.all([
    listImportBatchFilesAdmin(batchId),
    listImportSuggestedRowsAdmin(batchId),
  ]);
  const counts: ImportBatchCounts = {
    files: files.length,
    filesReady: files.filter((f) => f.status === "ready" || f.status === "extracted").length,
    filesFailed: files.filter((f) => f.status === "failed").length,
    rows: rows.length,
    rowsAccepted: rows.filter((r) => r.selected).length,
    rowsLowConfidence: rows.filter((r) => r.confidence < 0.55).length,
  };
  await updateImportBatchAdmin(batchId, { counts });
  return counts;
}

export type AddImportBatchFileParams = {
  companyId: string;
  batchId: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
  documentImportId?: string;
};

/**
 * Upload a file into an existing batch (Storage + Firestore file doc).
 * Images get a WebP preview. Does not run AI — caller kicks processing.
 */
export async function addFileToImportBatchAdmin(
  params: AddImportBatchFileParams,
): Promise<{ batch: ImportBatch; file: ImportBatchFile }> {
  const companyId = normalizeCompanyId(params.companyId);
  const batch = await getImportBatchAdmin(companyId, params.batchId);
  if (!batch) throw new Error("Import session not found");
  if (batch.status === "completed" || batch.status === "cancelled" || batch.status === "expired") {
    throw new Error("This import session is already closed");
  }
  if (batch.expiresAt.getTime() < Date.now()) {
    await updateImportBatchAdmin(batch.id, { status: "expired" });
    throw new Error("The import session has expired");
  }

  const kind = detectImportFileKind(params.contentType, params.fileName);
  const fileRef = filesCol(batch.id).doc();
  const ext = extensionFor(params.contentType, params.fileName);
  const storagePath = `import-batches/${companyId}/${batch.id}/${fileRef.id}.${ext}`;
  const now = FieldValue.serverTimestamp();

  await fileRef.set({
    batchId: batch.id,
    companyId,
    kind,
    status: "uploading",
    contentType: params.contentType,
    fileName: params.fileName ?? null,
    byteSize: params.buffer.byteLength,
    storagePath: "",
    downloadUrl: "",
    previewStoragePath: null,
    previewDownloadUrl: null,
    ocrText: null,
    error: null,
    documentImportId: params.documentImportId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const uploaded = await uploadBytes({
      storagePath,
      buffer: params.buffer,
      contentType: params.contentType,
    });

    let previewStoragePath: string | null = null;
    let previewDownloadUrl: string | null = null;
    let width: number | undefined;
    let height: number | undefined;

    if (kind === "image") {
      try {
        const preview = await createDocumentImportPreview(params.buffer);
        const previewUpload = await uploadBytes({
          storagePath: `import-batches/${companyId}/${batch.id}/${fileRef.id}-preview.webp`,
          buffer: preview.buffer,
          contentType: preview.contentType,
        });
        previewStoragePath = previewUpload.storagePath;
        previewDownloadUrl = previewUpload.downloadUrl;
        width = preview.width;
        height = preview.height;
      } catch {
        // Preview is best-effort
      }
    }

    await fileRef.set(
      {
        status: "ready",
        storagePath: uploaded.storagePath,
        downloadUrl: uploaded.downloadUrl,
        previewStoragePath,
        previewDownloadUrl,
        width: width ?? null,
        height: height ?? null,
        error: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const counts = await recomputeBatchCounts(batch.id);
    if (batch.status === "collecting" || batch.status === "review") {
      await updateImportBatchAdmin(batch.id, {
        status: batch.status === "review" ? "processing" : "collecting",
        counts,
      });
    }

    const [fileSnap, batchSnap] = await Promise.all([
      fileRef.get(),
      batchRef(batch.id).get(),
    ]);

    return {
      batch: mapImportBatch(batch.id, (batchSnap.data() ?? {}) as Record<string, unknown>),
      file: mapImportBatchFile(fileRef.id, (fileSnap.data() ?? {}) as Record<string, unknown>),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить файл";
    await fileRef.set(
      {
        status: "failed",
        error: message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await recomputeBatchCounts(batch.id);
    throw error;
  }
}

export async function upsertSuggestedRowsAdmin(
  batchId: string,
  companyId: string,
  rows: Array<Omit<ImportSuggestedRow, "id" | "batchId" | "companyId" | "createdAt" | "updatedAt"> & { id?: string }>,
): Promise<ImportSuggestedRow[]> {
  const db = getAdminFirestore();
  const col = rowsCol(batchId);
  const written: ImportSuggestedRow[] = [];

  for (const row of rows) {
    const ref = row.id ? col.doc(row.id) : col.doc();
    const payload = {
      batchId,
      companyId: normalizeCompanyId(companyId),
      sourceFileId: row.sourceFileId ?? null,
      selected: row.selected !== false,
      confidence: row.confidence,
      serialCode: row.serialCode,
      brandName: row.brandName,
      engineCode: row.engineCode,
      configuration: row.configuration,
      notes: row.notes,
      quantity: row.quantity,
      transmission: row.transmission,
      vin: row.vin ?? null,
      price: row.price ?? null,
      compatibility: row.compatibility ?? null,
      errors: row.errors ?? [],
      warnings: row.warnings ?? [],
      summary: row.summary,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await ref.set(payload, { merge: true });
    const snap = await ref.get();
    written.push(mapImportSuggestedRow(ref.id, (snap.data() ?? {}) as Record<string, unknown>));
  }

  const counts = await recomputeBatchCounts(batchId);
  await updateImportBatchAdmin(batchId, {
    counts,
    status: counts.rows > 0 ? "review" : "collecting",
    aiStatus: "done",
  });

  return written;
}

export async function updateSuggestedRowAdmin(
  batchId: string,
  rowId: string,
  patch: Partial<ImportSuggestedRow>,
): Promise<ImportSuggestedRow | null> {
  const ref = rowsCol(batchId).doc(rowId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const allowed: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  const keys = [
    "selected",
    "confidence",
    "serialCode",
    "brandName",
    "engineCode",
    "configuration",
    "notes",
    "quantity",
    "transmission",
    "vin",
    "price",
    "compatibility",
    "errors",
    "warnings",
    "summary",
  ] as const;
  for (const key of keys) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }

  await ref.set(allowed, { merge: true });
  await recomputeBatchCounts(batchId);
  const next = await ref.get();
  return mapImportSuggestedRow(rowId, (next.data() ?? {}) as Record<string, unknown>);
}

export async function updateImportBatchFileAdmin(
  batchId: string,
  fileId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await filesCol(batchId)
    .doc(fileId)
    .set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await recomputeBatchCounts(batchId);
}

/** Ensure a collecting batch exists — reuse open batch for same user if still valid. */
export async function ensureOpenImportBatchAdmin(params: {
  companyId: string;
  createdBy: string;
  batchId?: string | null;
  target?: ImportBatchTarget;
}): Promise<ImportBatch> {
  const companyId = normalizeCompanyId(params.companyId);

  if (params.batchId) {
    const existing = await getImportBatchAdmin(companyId, params.batchId);
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      if (["collecting", "processing", "review"].includes(existing.status)) {
        return existing;
      }
    }
  }

  // Prefer most recent open batch by this user (companyId-only query — no composite index).
  const recent = await getAdminFirestore()
    .collection(IMPORT_BATCHES_COLLECTION)
    .where("companyId", "==", companyId)
    .limit(40)
    .get();

  const open = recent.docs
    .map((doc) => mapImportBatch(doc.id, doc.data() as Record<string, unknown>))
    .filter(
      (batch) =>
        batch.createdBy === params.createdBy &&
        ["collecting", "processing", "review"].includes(batch.status) &&
        batch.expiresAt.getTime() > Date.now(),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (open[0]) return open[0];

  return createImportBatchAdmin({
    companyId,
    createdBy: params.createdBy,
    target: params.target,
  });
}
