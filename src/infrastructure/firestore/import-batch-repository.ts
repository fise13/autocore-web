"use client";

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import {
  EMPTY_IMPORT_BATCH_COUNTS,
  IMPORT_BATCH_FILES_SUBCOLLECTION,
  IMPORT_BATCH_ROWS_SUBCOLLECTION,
  IMPORT_BATCHES_COLLECTION,
  type ImportBatch,
  type ImportBatchAiStatus,
  type ImportBatchFile,
  type ImportBatchFileKind,
  type ImportBatchFileStatus,
  type ImportBatchStatus,
  type ImportBatchTarget,
  type ImportSuggestedRow,
} from "@/domain/import-batch";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

function mapCounts(raw: unknown) {
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

function mapBatch(id: string, data: Record<string, unknown>): ImportBatch {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    createdBy: String(data.createdBy ?? ""),
    target: (data.target as ImportBatchTarget) ?? "motors",
    status: (data.status as ImportBatchStatus) ?? "collecting",
    aiStatus: (data.aiStatus as ImportBatchAiStatus) ?? "idle",
    title: typeof data.title === "string" ? data.title : undefined,
    counts: mapCounts(data.counts),
    expiresAt: toDateFromFirestore(data.expiresAt) ?? new Date(),
    appliedMotorIds: Array.isArray(data.appliedMotorIds)
      ? data.appliedMotorIds.map(String)
      : undefined,
    error: typeof data.error === "string" ? data.error : null,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

function mapFile(id: string, data: Record<string, unknown>): ImportBatchFile {
  return {
    id,
    batchId: String(data.batchId ?? ""),
    companyId: String(data.companyId ?? ""),
    kind: (data.kind as ImportBatchFileKind) ?? "other",
    status: (data.status as ImportBatchFileStatus) ?? "ready",
    contentType: String(data.contentType ?? ""),
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
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

function mapRow(id: string, data: Record<string, unknown>): ImportSuggestedRow {
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
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

export class ImportBatchRepository {
  subscribe(
    companyId: string,
    onData: (batches: ImportBatch[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    const q = query(
      collection(db, IMPORT_BATCHES_COLLECTION),
      where("companyId", "==", normalizeCompanyId(companyId)),
      limit(40),
    );

    return onSnapshot(
      q,
      (snap) => {
        const batches = snap.docs
          .map((entry) => mapBatch(entry.id, entry.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onData(batches);
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  subscribeOne(
    companyId: string,
    batchId: string,
    onData: (batch: ImportBatch | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    return onSnapshot(
      doc(db, IMPORT_BATCHES_COLLECTION, batchId),
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
          onData(null);
          return;
        }
        onData(mapBatch(snap.id, data));
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  subscribeFiles(
    batchId: string,
    onData: (files: ImportBatchFile[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    const q = query(
      collection(db, IMPORT_BATCHES_COLLECTION, batchId, IMPORT_BATCH_FILES_SUBCOLLECTION),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        onData(snap.docs.map((entry) => mapFile(entry.id, entry.data() as Record<string, unknown>)));
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  subscribeRows(
    batchId: string,
    onData: (rows: ImportSuggestedRow[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    const q = query(
      collection(db, IMPORT_BATCHES_COLLECTION, batchId, IMPORT_BATCH_ROWS_SUBCOLLECTION),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        onData(snap.docs.map((entry) => mapRow(entry.id, entry.data() as Record<string, unknown>)));
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }
}
