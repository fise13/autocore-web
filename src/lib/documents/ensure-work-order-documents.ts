import "server-only";

import { WorkOrder } from "@/domain/work-order";
import { fetchWorkOrder, enqueueDocumentJob, contextSnapshotHash } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { buildDocumentContextFromOrder } from "@/lib/documents/build-context-from-order";
import {
  resolveDocumentsForOrderCompleted,
  resolveDocumentsForOrderCreated,
} from "@/lib/documents/policy/document-policy";
import { DocumentSlug } from "@/lib/documents/document-types";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { DOCUMENT_BY_SLUG } from "@/lib/documents/document-types";
import { kickDocumentQueueWorker } from "@/lib/documents/engine/kick-document-queue";
import { getAppUrl } from "@/lib/site-urls";

function applicableSlugs(order: WorkOrder): DocumentSlug[] {
  if (order.status === "draft" || order.status === "confirmed" || order.status === "in_progress") {
    return resolveDocumentsForOrderCreated();
  }
  if (order.status === "completed" || order.status === "delivered") {
    const context = buildDocumentContextFromOrder(order);
    return resolveDocumentsForOrderCompleted(context);
  }
  return [];
}

async function readReadyHashes(params: {
  companyId: string;
  workOrderId: string;
}): Promise<Map<DocumentSlug, string>> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("workOrderDocuments")
    .where("workOrderId", "==", params.workOrderId)
    .get();

  const map = new Map<DocumentSlug, string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const slug = typeof data.slug === "string" ? (data.slug as DocumentSlug) : null;
    const type = data.type as string;
    const resolvedSlug =
      slug ??
      (Object.values(DOCUMENT_BY_SLUG).find((definition) => definition.type === type)?.slug as
        | DocumentSlug
        | undefined);
    if (!resolvedSlug) continue;
    if (data.status === "ready") {
      const hasHttp =
        typeof data.downloadUrl === "string" &&
        /^https?:\/\//i.test(data.downloadUrl.trim());
      const hasStorage = typeof data.storagePath === "string" && data.storagePath.trim().length > 0;
      if ((hasHttp || hasStorage) && typeof data.contextHash === "string") {
        map.set(resolvedSlug, data.contextHash);
      }
    }
  }
  return map;
}

export async function ensureWorkOrderDocumentsScheduled(params: {
  companyId: string;
  workOrderId: string;
  origin?: string;
  authorization?: string | null;
}): Promise<{ jobId?: string; slugs: DocumentSlug[] }> {
  const order = await fetchWorkOrder(params.companyId, params.workOrderId);
  if (!order) {
    throw new Error("Work order not found");
  }

  const slugs = applicableSlugs(order);
  if (slugs.length === 0) {
    return { slugs: [] };
  }

  const context = buildDocumentContextFromOrder(order);
  const hash = contextSnapshotHash(context.order);
  const readyHashes = await readReadyHashes({
    companyId: params.companyId,
    workOrderId: params.workOrderId,
  });

  const staleOrMissing = slugs.filter((slug) => readyHashes.get(slug) !== hash);
  if (staleOrMissing.length === 0) {
    return { slugs: [] };
  }

  const jobId = await enqueueDocumentJob({
    companyId: params.companyId,
    aggregateType: "work_order",
    aggregateId: params.workOrderId,
    slugs: staleOrMissing,
  });

  const origin = params.origin?.trim() || getAppUrl();
  // Immediate kick so PDFs land in Storage ASAP (Firebase onWrite is a backup).
  await kickDocumentQueueWorker({
    origin,
    companyId: params.companyId,
    jobId,
    authorization: params.authorization ?? null,
  });

  return { jobId, slugs: staleOrMissing };
}
