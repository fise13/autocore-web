/**
 * Document Import jobs — photo uploads from mobile for later review (and future AI).
 * Distinct from Excel motor/inventory imports.
 */

export const DOCUMENT_IMPORT_STATUSES = ["pending", "ready", "imported", "failed"] as const;

export type DocumentImportStatus = (typeof DOCUMENT_IMPORT_STATUSES)[number];

/** Placeholder for future extraction pipeline — idle until AI stage. */
export type DocumentImportAiStatus = "idle" | "processing" | "done" | "failed";

export type DocumentImportJob = {
  id: string;
  companyId: string;
  createdBy: string;
  status: DocumentImportStatus;
  originalStoragePath: string;
  originalDownloadUrl: string;
  previewStoragePath: string | null;
  previewDownloadUrl: string | null;
  contentType: string;
  fileName?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  error?: string | null;
  /** Reserved for future AI Import — keep null in v1. */
  extractedData?: unknown | null;
  aiStatus?: DocumentImportAiStatus;
  createdAt: Date;
  updatedAt: Date;
};
