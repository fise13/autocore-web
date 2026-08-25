import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

import type { CommitLedger } from "./commit-plan";
import type { ImportPlan } from "./contracts";

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

/**
 * Store the plan and open the job.
 *
 * The plan goes in as JSON rather than a nested document tree: it is written
 * once, read once, and never queried, so structure would buy nothing and cost
 * a document-size ceiling that a large import would hit.
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
      planJson: JSON.stringify(plan),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadImportPlan(
  companyId: string,
  importId: string,
): Promise<{ plan: ImportPlan; job: ImportJobRecord } | null> {
  const snapshot = await jobRef(companyId, importId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Record<string, unknown>;
  const raw = typeof data.planJson === "string" ? data.planJson : "";
  if (!raw) return null;

  let plan: ImportPlan;
  try {
    plan = JSON.parse(raw) as ImportPlan;
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
