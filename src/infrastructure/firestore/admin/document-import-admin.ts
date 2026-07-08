import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import type { DocumentImportJob, DocumentImportStatus } from "@/domain/document-import";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildFirebaseStorageDownloadUrl } from "@/lib/company/upload-company-logo-utils";
import { createDocumentImportPreview } from "@/lib/document-import/create-preview-image.server";

export const DOCUMENT_IMPORTS_COLLECTION = "documentImports";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

export function mapDocumentImportJob(
  id: string,
  data: Record<string, unknown>,
): DocumentImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    createdBy: String(data.createdBy ?? ""),
    status: (data.status as DocumentImportStatus) ?? "pending",
    originalStoragePath: String(data.originalStoragePath ?? ""),
    originalDownloadUrl: String(data.originalDownloadUrl ?? ""),
    previewStoragePath:
      typeof data.previewStoragePath === "string" ? data.previewStoragePath : null,
    previewDownloadUrl:
      typeof data.previewDownloadUrl === "string" ? data.previewDownloadUrl : null,
    contentType: String(data.contentType ?? "image/jpeg"),
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    width: typeof data.width === "number" ? data.width : undefined,
    height: typeof data.height === "number" ? data.height : undefined,
    byteSize: typeof data.byteSize === "number" ? data.byteSize : undefined,
    error: typeof data.error === "string" ? data.error : null,
    extractedData: data.extractedData ?? null,
    aiStatus: (data.aiStatus as DocumentImportJob["aiStatus"]) ?? "idle",
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

function extensionForContentType(contentType: string, fileName?: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (EXTENSION_BY_TYPE[normalized]) return EXTENSION_BY_TYPE[normalized]!;
  const fromName = fileName?.split(".").pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName !== "jpeg") return fromName;
  if (fromName === "jpeg") return "jpg";
  return "jpg";
}

export type CreateDocumentImportParams = {
  companyId: string;
  createdBy: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
};

/**
 * Create ImportJob, store original + WebP preview, mark ready (or failed).
 */
export async function createDocumentImportJob(
  params: CreateDocumentImportParams,
): Promise<DocumentImportJob> {
  const db = getAdminFirestore();
  const companyId = normalizeCompanyId(params.companyId);
  const docRef = db.collection(DOCUMENT_IMPORTS_COLLECTION).doc();
  const jobId = docRef.id;
  const now = FieldValue.serverTimestamp();
  const ext = extensionForContentType(params.contentType, params.fileName);
  const originalPath = `document-imports/${companyId}/${jobId}/original.${ext}`;

  await docRef.set({
    companyId,
    createdBy: params.createdBy,
    status: "pending",
    originalStoragePath: "",
    originalDownloadUrl: "",
    previewStoragePath: null,
    previewDownloadUrl: null,
    contentType: params.contentType,
    fileName: params.fileName ?? null,
    byteSize: params.buffer.byteLength,
    error: null,
    extractedData: null,
    aiStatus: "idle",
    createdAt: now,
    updatedAt: now,
  });

  try {
    const original = await uploadBytes({
      storagePath: originalPath,
      buffer: params.buffer,
      contentType: params.contentType,
    });

    const preview = await createDocumentImportPreview(params.buffer);
    const previewUpload = await uploadBytes({
      storagePath: `document-imports/${companyId}/${jobId}/preview.webp`,
      buffer: preview.buffer,
      contentType: preview.contentType,
    });

    await docRef.set(
      {
        status: "ready",
        originalStoragePath: original.storagePath,
        originalDownloadUrl: original.downloadUrl,
        previewStoragePath: previewUpload.storagePath,
        previewDownloadUrl: previewUpload.downloadUrl,
        width: preview.width,
        height: preview.height,
        error: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const snap = await docRef.get();
    return mapDocumentImportJob(jobId, (snap.data() ?? {}) as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обработать документ";
    await docRef.set(
      {
        status: "failed",
        error: message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    throw error;
  }
}

export async function getDocumentImportJobAdmin(
  companyId: string,
  jobId: string,
): Promise<DocumentImportJob | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(DOCUMENT_IMPORTS_COLLECTION).doc(jobId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
    return null;
  }
  return mapDocumentImportJob(snap.id, data);
}
