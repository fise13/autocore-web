import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentContext } from "@/lib/documents/document-context";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { contextSnapshotHash } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { mapDocumentError } from "@/lib/documents/map-document-error";

type DocumentJobRecord = {
  id: string;
  companyId: string;
  aggregateType: string;
  aggregateId: string;
  requestedSlugs: DocumentSlug[];
  completedSlugs: DocumentSlug[];
  status: string;
  attempts: number;
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
    status: String(data.status ?? "pending"),
    attempts: Number(data.attempts ?? 0),
  };
}

async function resolveTheme(companyId: string): Promise<string> {
  const db = getAdminFirestore();
  const snap = await db.collection("companies").doc(normalizeCompanyId(companyId)).get();
  if (!snap.exists) return "modern";
  const branding = companyBrandingFromRecord(snap.data() as Record<string, unknown>);
  return branding.documentTheme ?? "modern";
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

export async function processDocumentQueueJob(params: {
  companyId: string;
  jobId: string;
}): Promise<{ completed: DocumentSlug[]; failed: DocumentSlug[] }> {
  const job = await fetchJob(params.companyId, params.jobId);
  if (!job || job.status === "done") {
    return { completed: [], failed: [] };
  }

  const db = getAdminFirestore();
  const jobRef = db
    .collection("companies")
    .doc(normalizeCompanyId(params.companyId))
    .collection("documentGenerationJobs")
    .doc(params.jobId);

  await jobRef.update({ status: "processing", attempts: FieldValue.increment(1) });

  const { loadDocumentContext } = await import("@/lib/documents/load-document-context");
  const { generateAndPersistDocument } = await import("@/lib/documents/generate-documents");
  const { DOCUMENT_BY_SLUG } = await import("@/lib/documents/document-types");

  let context;
  if (job.aggregateType === "work_order") {
    context = await loadDocumentContext(params.companyId, job.aggregateId);
  } else if (job.aggregateType === "quote") {
    const { loadQuoteDocumentContext } = await import("@/lib/documents/context/load-quote-context");
    context = await loadQuoteDocumentContext(params.companyId, job.aggregateId);
  } else if (job.aggregateType === "warranty") {
    const { loadWarrantyDocumentContext } = await import("@/lib/documents/context/load-warranty-context");
    context = await loadWarrantyDocumentContext(params.companyId, job.aggregateId);
  } else {
    throw new Error(`Unsupported aggregate type: ${job.aggregateType}`);
  }

  const theme = context.theme ?? (await resolveTheme(params.companyId));
  const hash = contextSnapshotHash(context.order);
  const completed: DocumentSlug[] = [...job.completedSlugs];
  const failed: DocumentSlug[] = [];

  const pending = job.requestedSlugs.filter((slug) => !completed.includes(slug));
  const concurrency = 2;

  for (let index = 0; index < pending.length; index += concurrency) {
    const batch = pending.slice(index, index + concurrency);
    await Promise.all(
      batch.map(async (slug) => {
        try {
          const document = await generateAndPersistDocument({
            slug,
            companyId: params.companyId,
            workOrderId: job.aggregateType === "work_order" ? job.aggregateId : context.order.id,
            context: { ...context, theme: theme as DocumentContext["theme"] },
          });
          await persistInstance({
            companyId: params.companyId,
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
          completed.push(slug);
        } catch (error) {
          console.error(`[document-queue] ${slug}`, error);
          failed.push(slug);
          if (failed.length === 1) {
            await jobRef.update({
              error: mapDocumentError(error, `Failed: ${slug}`),
            });
          }
        }
      }),
    );
  }

  await jobRef.update({
    completedSlugs: completed,
    status: failed.length > 0 && completed.length === 0 ? "failed" : "done",
    completedAt: FieldValue.serverTimestamp(),
    ...(failed.length > 0 ? { error: `Failed: ${failed.join(", ")}` } : {}),
  });

  return { completed, failed };
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
    status: String(data.status ?? "pending"),
    attempts: Number(data.attempts ?? 0),
  };
}
