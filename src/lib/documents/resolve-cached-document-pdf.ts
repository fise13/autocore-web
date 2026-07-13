import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import { normalizeCompanyId } from "@/lib/company-id";

export type CachedWorkOrderPdf = {
  downloadUrl: string;
  storagePath?: string;
  status?: string;
  contextHash?: string;
};

function isBrowserSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function readCachedWorkOrderPdfMetadata(params: {
  companyId: string;
  workOrderId: string;
  slug: DocumentSlug;
}): Promise<CachedWorkOrderPdf | null> {
  const definition = DOCUMENT_BY_SLUG[params.slug];
  if (!definition) return null;

  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(params.companyId);
  const snapshot = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("workOrderDocuments")
    .where("workOrderId", "==", params.workOrderId)
    .where("type", "==", definition.type)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  const downloadUrl = String(data.downloadUrl ?? "").trim();
  const storagePath = typeof data.storagePath === "string" ? data.storagePath.trim() : "";
  const status = typeof data.status === "string" ? data.status : undefined;

  // Ready if we have Storage path or a real http(s) URL (ignore gs:// / garbage schemes).
  const hasHttpUrl = Boolean(downloadUrl && isBrowserSafeHttpUrl(downloadUrl));
  const hasStorage = Boolean(storagePath);
  if (status === "failed") return null;
  if (!hasHttpUrl && !hasStorage) return null;
  if (status && status !== "ready" && status !== "pending") return null;
  if (status === "pending" && !hasStorage && !hasHttpUrl) return null;

  return {
    downloadUrl: hasHttpUrl ? downloadUrl : "",
    storagePath: hasStorage ? storagePath : undefined,
    status,
    contextHash: typeof data.contextHash === "string" ? data.contextHash : undefined,
  };
}

async function downloadPdfFromStoragePath(storagePath: string): Promise<Buffer | null> {
  try {
    const bucket = await resolveAdminStorageBucket();
    const [bytes] = await bucket.file(storagePath).download();
    return bytes.length > 0 ? Buffer.from(bytes) : null;
  } catch (error) {
    console.warn("[documents/cache] storage download failed", storagePath, error);
    return null;
  }
}

export async function readCachedWorkOrderPdf(params: {
  companyId: string;
  workOrderId: string;
  slug: DocumentSlug;
}): Promise<Buffer | null> {
  const cached = await readCachedWorkOrderPdfMetadata(params);
  if (!cached) return null;

  if (cached.storagePath) {
    const fromStorage = await downloadPdfFromStoragePath(cached.storagePath);
    if (fromStorage) return fromStorage;
  }

  if (cached.downloadUrl && isBrowserSafeHttpUrl(cached.downloadUrl)) {
    try {
      const response = await fetch(cached.downloadUrl, { cache: "no-store" });
      if (!response.ok) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      return bytes.length > 0 ? bytes : null;
    } catch (error) {
      console.warn("[documents/cache] http download failed", error);
      return null;
    }
  }

  return null;
}

export async function findActiveDocumentJob(params: {
  companyId: string;
  aggregateId: string;
}): Promise<{ id: string; status: string } | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("documentGenerationJobs")
    .where("aggregateId", "==", params.aggregateId)
    .orderBy("createdAt", "desc")
    .limit(3)
    .get();

  for (const doc of snap.docs) {
    const status = String(doc.data().status ?? "");
    if (status === "pending" || status === "processing") {
      return { id: doc.id, status };
    }
  }
  return null;
}

export { isBrowserSafeHttpUrl };
