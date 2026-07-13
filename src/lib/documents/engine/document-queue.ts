import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentContext } from "@/lib/documents/document-context";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { contextSnapshotHash } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import type { DocumentJobStatus } from "@/domain/document-generation";
import { DOCUMENT_BY_SLUG } from "@/lib/documents/document-types";

/** Parallel PDFs per process-queue tick. Keep modest — Puppeteer+Next render is heavy locally. */
const BATCH_SIZE = 2;

type DocumentJobRecord = {
  id: string;
  companyId: string;
  aggregateType: string;
  aggregateId: string;
  requestedSlugs: DocumentSlug[];
  completedSlugs: DocumentSlug[];
  failedSlugs: DocumentSlug[];
  status: string;
  attempts: number;
  contextHash?: string;
};

export type ProcessDocumentSlugResult = {
  processedSlug: DocumentSlug | null;
  failedSlug: DocumentSlug | null;
  processedSlugs: DocumentSlug[];
  failedSlugsThisTick: DocumentSlug[];
  hasMore: boolean;
  jobStatus: DocumentJobStatus;
  completed: DocumentSlug[];
  failed: DocumentSlug[];
};

async function fetchJob(companyId: string, jobId: string): Promise<DocumentJobRecord | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("documentGenerationJobs")
    .doc(jobId)
    .get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    id: snap.id,
    companyId: String(data.companyId ?? companyId),
    aggregateType: String(data.aggregateType ?? "work_order"),
    aggregateId: String(data.aggregateId ?? ""),
    requestedSlugs: Array.isArray(data.requestedSlugs) ? (data.requestedSlugs as DocumentSlug[]) : [],
    completedSlugs: Array.isArray(data.completedSlugs) ? (data.completedSlugs as DocumentSlug[]) : [],
    failedSlugs: Array.isArray(data.failedSlugs) ? (data.failedSlugs as DocumentSlug[]) : [],
    status: String(data.status ?? "pending"),
    attempts: Number(data.attempts ?? 0),
    contextHash: typeof data.contextHash === "string" ? data.contextHash : undefined,
  };
}

async function resolveTheme(companyId: string): Promise<string> {
  const db = getAdminFirestore();
  const snap = await db.collection("companies").doc(normalizeCompanyId(companyId)).get();
  if (!snap.exists) return "modern";
  const branding = companyBrandingFromRecord(snap.data() as Record<string, unknown>);
  return branding.documentTheme ?? "modern";
}

async function loadJobContext(job: DocumentJobRecord): Promise<DocumentContext> {
  if (job.aggregateType === "work_order") {
    const { loadDocumentContext } = await import("@/lib/documents/load-document-context");
    return loadDocumentContext(job.companyId, job.aggregateId);
  }
  if (job.aggregateType === "quote") {
    const { loadQuoteDocumentContext } = await import("@/lib/documents/context/load-quote-context");
    return loadQuoteDocumentContext(job.companyId, job.aggregateId);
  }
  if (job.aggregateType === "warranty") {
    const { loadWarrantyDocumentContext } = await import("@/lib/documents/context/load-warranty-context");
    return loadWarrantyDocumentContext(job.companyId, job.aggregateId);
  }
  throw new Error(`Unsupported aggregate type: ${job.aggregateType}`);
}

async function readCachedContextHash(params: {
  companyId: string;
  workOrderId: string;
  slug: DocumentSlug;
}): Promise<string | null> {
  const definition = DOCUMENT_BY_SLUG[params.slug];
  if (!definition) return null;

  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("workOrderDocuments")
    .where("workOrderId", "==", params.workOrderId)
    .where("type", "==", definition.type)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const data = snap.docs[0].data();
  if (data.status === "ready" && typeof data.downloadUrl === "string" && data.downloadUrl.trim()) {
    return typeof data.contextHash === "string" ? data.contextHash : null;
  }
  return null;
}

async function persistInstance(params: {
  companyId: string;
  aggregateType: string;
  aggregateId: string;
  slug: DocumentSlug;
  type: string;
  title: string;
  theme: string;
  storagePath: string;
  downloadUrl?: string;
  contextHash: string;
}) {
  const db = getAdminFirestore();
  const ref = db.collection("companies").doc(normalizeCompanyId(params.companyId)).collection("documentInstances").doc();
  await ref.set({
    ...params,
    version: 1,
    generatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

function pendingSlugs(job: DocumentJobRecord): DocumentSlug[] {
  const done = new Set([...job.completedSlugs, ...job.failedSlugs]);
  return job.requestedSlugs.filter((slug) => !done.has(slug));
}

function finalizeJobStatus(job: Pick<DocumentJobRecord, "requestedSlugs" | "completedSlugs" | "failedSlugs">): DocumentJobStatus {
  const done = new Set([...job.completedSlugs, ...job.failedSlugs]);
  const allHandled = job.requestedSlugs.every((slug) => done.has(slug));
  if (!allHandled) return "processing";
  if (job.completedSlugs.length === 0 && job.failedSlugs.length > 0) return "failed";
  return "done";
}

async function processOneSlug(params: {
  job: DocumentJobRecord;
  slug: DocumentSlug;
  context: DocumentContext;
  theme: string;
  hash: string;
  workOrderId: string;
}): Promise<{ ok: true; slug: DocumentSlug } | { ok: false; slug: DocumentSlug; error: unknown }> {
  const { job, slug, context, theme, hash, workOrderId } = params;
  const { generateAndPersistDocument } = await import("@/lib/documents/generate-documents");

  try {
    if (job.aggregateType === "work_order") {
      const cachedHash = await readCachedContextHash({
        companyId: job.companyId,
        workOrderId,
        slug,
      });
      if (cachedHash && cachedHash === hash) {
        return { ok: true, slug };
      }
    }

    const document = await generateAndPersistDocument({
      slug,
      companyId: job.companyId,
      workOrderId,
      context: { ...context, theme: theme as DocumentContext["theme"] },
      contextHash: hash,
    });
    await persistInstance({
      companyId: job.companyId,
      aggregateType: job.aggregateType,
      aggregateId: job.aggregateId,
      slug,
      type: document.type,
      title: document.title,
      theme,
      storagePath: document.storagePath ?? "",
      downloadUrl: document.downloadUrl,
      contextHash: hash,
    });
    return { ok: true, slug };
  } catch (error) {
    console.error(`[document-queue] ${slug}`, error);
    return { ok: false, slug, error };
  }
}

/**
 * Process up to BATCH_SIZE pending slugs in parallel with one shared context load.
 * Safe within Vercel 60s when batch size stays small.
 */
export async function processNextDocumentBatch(params: {
  companyId: string;
  jobId: string;
}): Promise<ProcessDocumentSlugResult> {
  const job = await fetchJob(params.companyId, params.jobId);
  if (!job || job.status === "done" || job.status === "failed") {
    return {
      processedSlug: null,
      failedSlug: null,
      processedSlugs: [],
      failedSlugsThisTick: [],
      hasMore: false,
      jobStatus: (job?.status as DocumentJobStatus) ?? "done",
      completed: job?.completedSlugs ?? [],
      failed: job?.failedSlugs ?? [],
    };
  }

  const db = getAdminFirestore();
  const jobRef = db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("documentGenerationJobs")
    .doc(params.jobId);

  const batch = pendingSlugs(job).slice(0, BATCH_SIZE);
  if (batch.length === 0) {
    const status = finalizeJobStatus(job);
    await jobRef.update({
      status,
      completedAt: FieldValue.serverTimestamp(),
      ...(status === "failed" ? {} : { error: FieldValue.delete() }),
    });
    return {
      processedSlug: null,
      failedSlug: null,
      processedSlugs: [],
      failedSlugsThisTick: [],
      hasMore: false,
      jobStatus: status,
      completed: job.completedSlugs,
      failed: job.failedSlugs,
    };
  }

  await jobRef.update({
    status: "processing",
    attempts: FieldValue.increment(1),
    error: FieldValue.delete(),
  });

  let context: DocumentContext;
  try {
    context = await loadJobContext(job);
  } catch (error) {
    const message = mapDocumentError(error, "Failed to load document context");
    const failed = [...job.failedSlugs, ...batch];
    await jobRef.update({
      status: "failed",
      error: message,
      failedSlugs: failed,
      completedAt: FieldValue.serverTimestamp(),
    });
    return {
      processedSlug: null,
      failedSlug: batch[0] ?? null,
      processedSlugs: [],
      failedSlugsThisTick: batch,
      hasMore: false,
      jobStatus: "failed",
      completed: job.completedSlugs,
      failed,
    };
  }

  const theme = context.theme ?? (await resolveTheme(params.companyId));
  const hash = contextSnapshotHash(context.order);
  await jobRef.set({ contextHash: hash }, { merge: true });

  const workOrderId = job.aggregateType === "work_order" ? job.aggregateId : context.order.id;

  const results = await Promise.all(
    batch.map((slug) =>
      processOneSlug({
        job,
        slug,
        context,
        theme,
        hash,
        workOrderId,
      }),
    ),
  );

  const processedSlugs = results.filter((r) => r.ok).map((r) => r.slug);
  const failedSlugsThisTick = results.filter((r) => !r.ok).map((r) => r.slug);
  const completed = [...job.completedSlugs, ...processedSlugs];
  const failed = [...job.failedSlugs, ...failedSlugsThisTick];
  const hasMore = completed.length + failed.length < job.requestedSlugs.length;
  const status = hasMore
    ? "pending"
    : finalizeJobStatus({ requestedSlugs: job.requestedSlugs, completedSlugs: completed, failedSlugs: failed });

  const firstError = results.find((r) => !r.ok);
  await jobRef.update({
    completedSlugs: completed,
    failedSlugs: failed,
    status,
    ...(firstError && !firstError.ok
      ? { error: mapDocumentError(firstError.error, `Failed: ${firstError.slug}`) }
      : { error: FieldValue.delete() }),
    ...(hasMore ? {} : { completedAt: FieldValue.serverTimestamp() }),
  });

  return {
    processedSlug: processedSlugs[0] ?? null,
    failedSlug: failedSlugsThisTick[0] ?? null,
    processedSlugs,
    failedSlugsThisTick,
    hasMore,
    jobStatus: status,
    completed,
    failed,
  };
}

/** @deprecated Prefer processNextDocumentBatch — kept for single-slug callers. */
export async function processNextDocumentSlug(params: {
  companyId: string;
  jobId: string;
}): Promise<ProcessDocumentSlugResult> {
  return processNextDocumentBatch(params);
}

/** @deprecated Use processNextDocumentBatch — kept for compatibility during migration. */
export async function processDocumentQueueJob(params: {
  companyId: string;
  jobId: string;
}): Promise<{ completed: DocumentSlug[]; failed: DocumentSlug[] }> {
  let result = await processNextDocumentBatch(params);
  let guard = 0;
  while (result.hasMore && guard < 12) {
    result = await processNextDocumentBatch(params);
    guard += 1;
  }
  return { completed: result.completed, failed: result.failed };
}

export async function fetchNextPendingJob(companyId: string): Promise<DocumentJobRecord | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("documentGenerationJobs")
    .where("status", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  const data = doc.data();
  return {
    id: doc.id,
    companyId: String(data.companyId ?? companyId),
    aggregateType: String(data.aggregateType ?? "work_order"),
    aggregateId: String(data.aggregateId ?? ""),
    requestedSlugs: Array.isArray(data.requestedSlugs) ? (data.requestedSlugs as DocumentSlug[]) : [],
    completedSlugs: Array.isArray(data.completedSlugs) ? (data.completedSlugs as DocumentSlug[]) : [],
    failedSlugs: Array.isArray(data.failedSlugs) ? (data.failedSlugs as DocumentSlug[]) : [],
    status: String(data.status ?? "pending"),
    attempts: Number(data.attempts ?? 0),
    contextHash: typeof data.contextHash === "string" ? data.contextHash : undefined,
  };
}

export { BATCH_SIZE };
