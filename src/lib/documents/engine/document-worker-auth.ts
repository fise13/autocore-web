import "server-only";

import { normalizeCompanyId } from "@/lib/company-id";

import { DocumentAccessError, type VerifiedDocumentAccess, verifyDocumentAccess } from "../verify-document-access";

export const DOCUMENT_WORKER_HEADER = "x-document-worker-key";

export function readDocumentWorkerSecret(): string | null {
  const secret = process.env.DOCUMENT_WORKER_SECRET?.trim();
  return secret || null;
}

export async function verifyDocumentQueueAccess(
  request: Request,
  bodyCompanyId?: string,
): Promise<VerifiedDocumentAccess> {
  const workerKey = request.headers.get(DOCUMENT_WORKER_HEADER)?.trim();
  const secret = readDocumentWorkerSecret();
  const companyId = normalizeCompanyId(bodyCompanyId ?? "");

  if (workerKey && secret && workerKey === secret && companyId) {
    return { uid: "document-worker", companyId };
  }

  return verifyDocumentAccess(request);
}

export function assertWorkerConfigured(): void {
  if (!readDocumentWorkerSecret()) {
    throw new DocumentAccessError("Document worker is not configured", 503);
  }
}
