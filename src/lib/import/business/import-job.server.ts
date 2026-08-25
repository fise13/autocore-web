import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

import type { CommitLedger } from "./commit-plan";
import type { ImportPlan } from "./contracts";
import {
  decodePlan,
  encodePlan,
  planChunkId,
  PLAN_FORMAT_GZIP_BASE64,
  PLAN_FORMAT_JSON,
  type PlanFormat,
} from "./plan-storage";

/**
 * Where a plan lives between "AutoCore understood your business" and "import".
 *
 * The plan is stored server-side and the commit request carries nothing but an
 * id. That is not a convenience — it is what makes the rest safe. A client that
 * could post its own plan could post one naming another company's records, and
 * no amount of re-validation downstream is as good as never accepting the
 * document in the first place.
 *
 * It is also what makes resume real. The ledger of what has already been
 * written lives beside the plan, keyed by the same fingerprints, so a run that
 * died at 600 of 1000 is a second call to the same endpoint rather than a
 * fresh import that duplicates everything.
 */

export const IMPORT_JOBS_SUBCOLLECTION = "importJobs";

/** Where the plan itself lives, one document per chunk. */
export const PLAN_CHUNKS_SUBCOLLECTION = "planChunks";

/** Chunks fetched per read request; see `readPlanJson`. */
const PLAN_CHUNK_READ_BATCH = 4;

export type ImportJobStatus =
  | "analyzing"
  | "ready"
  | "committing"
  | "completed"
  | "partial"
  | "failed";

export type ImportJobRecord = {
  id: string;
  companyId: string;
  createdBy: string;
  status: ImportJobStatus;
  sourceFiles: string[];
  totalActions: number;
  processedActions: number;
  created: number;
  updated: number;
  skipped: number;
  reviewRequired: number;
  errors: number;
  /** Entity kinds understood but not writable, so the report can say so. */
  deferred: string[];
  /** Whether the model actually contributed to this plan. */
  aiUsed: boolean;
  aiProvider: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string | null;
};

function jobRef(companyId: string, importId: string) {
  return getAdminFirestore()
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection(IMPORT_JOBS_SUBCOLLECTION)
    .doc(importId);
}

function ledgerRef(companyId: string, importId: string) {
  return jobRef(companyId, importId).collection("written");
}

function planChunksRef(companyId: string, importId: string) {
  return jobRef(companyId, importId).collection(PLAN_CHUNKS_SUBCOLLECTION);
}

/**
 * Store the plan and open the job.
 *
 * The plan is compressed and split across `planChunks` rather than written
 * into a field on the job. It is written once, read once and never queried, so
 * structure would buy nothing — but a single field carries Firestore's
 * 1,048,576-byte document ceiling, and a real dismantler's book blows through
 * it. A file's size is not a reason to refuse to import it.
 *
 * Chunks are written before the job document is pointed at them, so a failure
 * halfway through leaves a job that still describes the previous plan or no
 * plan at all — never a job claiming a plan that is only half stored.
 */
export async function saveImportJob(params: {
  plan: ImportPlan;
  companyId: string;
  createdBy: string;
  sourceFiles: string[];
  aiUsed: boolean;
  aiProvider: string;
}): Promise<void> {
  const { plan } = params;
  const chunks = encodePlan(plan);

  await writePlanChunks(params.companyId, plan.importId, chunks);

  await jobRef(params.companyId, plan.importId).set(
    {
      id: plan.importId,
      companyId: normalizeCompanyId(params.companyId),
      createdBy: params.createdBy,
      status: "ready" satisfies ImportJobStatus,
      sourceFiles: params.sourceFiles,
      totalActions: plan.summary.totalActions,
      processedActions: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      reviewRequired: plan.summary.needsReview,
      errors: 0,
      deferred: plan.summary.deferred,
      aiUsed: params.aiUsed,
      aiProvider: params.aiProvider,
      planFormat: PLAN_FORMAT_GZIP_BASE64,
      planChunkCount: chunks.length,
      // A re-analysis of the same import id must not leave the old inline plan
      // behind for the reader to prefer.
      planJson: FieldValue.delete(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await deleteStalePlanChunks(params.companyId, plan.importId, chunks.length);
}

async function writePlanChunks(
  companyId: string,
  importId: string,
  chunks: string[],
): Promise<void> {
  const collection = planChunksRef(companyId, importId);
  // One request per chunk: each is near the document ceiling on its own, and a
  // batch of them would exceed the write request's own size limit.
  for (const [sequence, data] of chunks.entries()) {
    await collection.doc(planChunkId(sequence)).set({ sequence, data });
  }
}

/**
 * Drop chunks left over from a longer previous plan for the same import id.
 *
 * The reader only takes `planChunkCount` chunks, so a leftover cannot corrupt
 * a plan — this is about not paying storage for documents nothing will read.
 */
async function deleteStalePlanChunks(
  companyId: string,
  importId: string,
  keep: number,
): Promise<void> {
  const existing = await planChunksRef(companyId, importId).listDocuments();
  const stale = existing.filter((doc) => {
    const sequence = Number(doc.id.replace("chunk-", ""));
    return !Number.isFinite(sequence) || sequence >= keep;
  });
  await Promise.all(stale.map((doc) => doc.delete()));
}

/**
 * Read the stored plan text, whichever way it was stored.
 *
 * Jobs written before the plan was chunked keep it inline in `planJson`, and
 * those imports must stay resumable rather than becoming unreadable the day
 * this deployed.
 */
async function readPlanJson(
  companyId: string,
  importId: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  const chunkCount = Number(data.planChunkCount ?? 0);
  if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
    const inline = typeof data.planJson === "string" ? data.planJson : "";
    return inline || null;
  }

  const collection = planChunksRef(companyId, importId);
  const refs = Array.from({ length: chunkCount }, (_, sequence) =>
    collection.doc(planChunkId(sequence)),
  );

  const chunks: string[] = [];
  // Read a few at a time: each chunk is close to a megabyte, and asking for
  // all of them at once would make the response itself the next size limit to
  // trip over.
  for (let start = 0; start < refs.length; start += PLAN_CHUNK_READ_BATCH) {
    const batch = refs.slice(start, start + PLAN_CHUNK_READ_BATCH);
    const snapshots = await getAdminFirestore().getAll(...batch);
    for (const snapshot of snapshots) {
      const value = (snapshot.data() as { data?: unknown } | undefined)?.data;
      // A gap means the text is truncated JSON. Say so instead of handing back
      // a plan that would import part of the file and report success.
      if (typeof value !== "string") return null;
      chunks.push(value);
    }
  }

  const format: PlanFormat =
    data.planFormat === PLAN_FORMAT_JSON ? PLAN_FORMAT_JSON : PLAN_FORMAT_GZIP_BASE64;

  try {
    return decodePlan(chunks, format);
  } catch {
    return null;
  }
}

export async function loadImportPlan(
  companyId: string,
  importId: string,
): Promise<{ plan: ImportPlan; job: ImportJobRecord } | null> {
  const snapshot = await jobRef(companyId, importId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Record<string, unknown>;

  const json = await readPlanJson(companyId, importId, data);
  if (!json) return null;

  let plan: ImportPlan;
  try {
    plan = JSON.parse(json) as ImportPlan;
  } catch {
    return null;
  }

  // The company on the plan is never trusted over the verified one: a stored
  // document is still an input, and this is the field that decides whose
  // database is written to.
  plan.companyId = normalizeCompanyId(companyId);

  return {
    plan,
    job: {
      id: String(data.id ?? importId),
      companyId: normalizeCompanyId(companyId),
      createdBy: String(data.createdBy ?? ""),
      status: (data.status as ImportJobStatus) ?? "ready",
      sourceFiles: Array.isArray(data.sourceFiles) ? data.sourceFiles.map(String) : [],
      totalActions: Number(data.totalActions ?? 0),
      processedActions: Number(data.processedActions ?? 0),
      created: Number(data.created ?? 0),
      updated: Number(data.updated ?? 0),
      skipped: Number(data.skipped ?? 0),
      reviewRequired: Number(data.reviewRequired ?? 0),
      errors: Number(data.errors ?? 0),
      deferred: Array.isArray(data.deferred) ? data.deferred.map(String) : [],
      aiUsed: Boolean(data.aiUsed),
      aiProvider: String(data.aiProvider ?? "none"),
      error: typeof data.error === "string" ? data.error : null,
    },
  };
}

export async function updateImportJob(
  companyId: string,
  importId: string,
  patch: Partial<Record<string, unknown>>,
): Promise<void> {
  await jobRef(companyId, importId).set(
    { ...patch, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

/**
 * A ledger backed by Firestore, loaded once up front.
 *
 * Reading the whole set before the run rather than checking per action is the
 * difference between one query and a thousand. Writes go through as they
 * happen, so a process that dies mid-run leaves an accurate record of exactly
 * what landed.
 */
export async function loadCommitLedger(
  companyId: string,
  importId: string,
): Promise<CommitLedger> {
  const snapshot = await ledgerRef(companyId, importId).get();
  const seen = new Map<string, string>();
  for (const doc of snapshot.docs) {
    const recordId = (doc.data() as { recordId?: unknown }).recordId;
    seen.set(doc.id, typeof recordId === "string" ? recordId : "");
  }

  return {
    has: (fingerprint) => seen.has(ledgerDocId(fingerprint)) || seen.has(fingerprint),
    remember: async (fingerprint, recordId) => {
      const id = ledgerDocId(fingerprint);
      seen.set(id, recordId);
      await ledgerRef(companyId, importId)
        .doc(id)
        .set({ fingerprint, recordId, writtenAt: FieldValue.serverTimestamp() });
    },
    idFor: (fingerprint) => seen.get(ledgerDocId(fingerprint)) ?? seen.get(fingerprint),
  };
}

/**
 * Firestore document ids cannot contain "/", and a fingerprint carries table
 * names and VINs straight from a customer's file. Hashing sidesteps every
 * character rule at once and keeps the id a fixed length.
 */
function ledgerDocId(fingerprint: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fp_${hash.toString(16)}_${fingerprint.length}`;
}
