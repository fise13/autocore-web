import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { verifyMigrationAccess } from "@/lib/auth/verify-migration-access.server";
import { commitImportPlan } from "@/lib/import/business/commit-plan";
import {
  loadCommitLedger,
  loadImportPlan,
  updateImportJob,
} from "@/lib/import/business/import-job.server";
import { ensureMigrationWarehouseAdmin } from "@/lib/import/migration-commit.server";
import { createAdminPlanWriters } from "@/lib/import/business/plan-writers.server";
import type { PlanAction } from "@/lib/import/business/contracts";

/**
 * Execute a stored plan. Nothing else.
 *
 * The request carries an import id and, at most, the merge decisions a person
 * made — never records, never a plan. Everything written comes from the
 * document the analyze route stored, and the company comes from the verified
 * token rather than the plan.
 *
 * Calling this twice is safe and is the resume path: the ledger of what
 * already landed lives beside the plan, keyed by fingerprints derived from
 * each record's own identity, so a run that died at 600 of 1000 continues at
 * 601 and creates nothing twice.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * How long one call spends writing.
 *
 * The route may run for 300 seconds; this stops well short of that so the
 * response is always a real answer rather than a platform timeout. What is
 * left comes back as `status: "partial"` with a count, and the client calls
 * again — which is the resume path that already existed, now used for pacing
 * as well as for recovery. A person watching a progress bar gets a number
 * that moves; a person watching a request that will be killed at 300 seconds
 * gets nothing at all, which is exactly what an import of 2,264 records used
 * to do.
 */
const WRITE_BUDGET_MS = 120_000;

type CommitPlanBody = {
  companyId?: string;
  importId?: string;
  /**
   * What the person decided about each proposed merge. Absent means "leave it
   * alone" — an unanswered destructive merge is never performed.
   */
  mergeDecisions?: Record<string, "accept" | "reject">;
};

/**
 * Apply the person's answers to the merges the plan proposed.
 *
 * Accepting turns the review back into an ordinary write; rejecting keeps the
 * records separate, which is what "keep separate" means. Anything unanswered
 * stays a review, because silence is not consent to destroy a record.
 */
function applyMergeDecisions(
  actions: PlanAction[],
  decisions: Record<string, "accept" | "reject">,
): PlanAction[] {
  return actions.map((action) => {
    const answer = decisions[action.entityId];
    if (!answer) return action;
    const isMergeReview = action.review.some((reason) => reason.code === "destructive-merge");
    if (!isMergeReview) return action;
    if (answer === "accept") {
      return { ...action, verb: "merge" as const, review: [] };
    }
    // Rejected: this is its own record after all.
    return { ...action, verb: "create" as const, mergedFrom: undefined, review: [] };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CommitPlanBody;
    const access = await verifyMigrationAccess(request, body.companyId?.trim());
    const importId = body.importId?.trim();
    if (!importId) {
      return NextResponse.json({ error: "importId is required" }, { status: 400 });
    }

    const stored = await loadImportPlan(access.companyId, importId);
    if (!stored) {
      return NextResponse.json({ error: "Import plan was not found" }, { status: 404 });
    }

    const plan = {
      ...stored.plan,
      actions: applyMergeDecisions(stored.plan.actions, body.mergeDecisions ?? {}),
    };

    const warehouseId = await ensureMigrationWarehouseAdmin(access.companyId, access.uid);
    const writers = await createAdminPlanWriters({
      companyId: access.companyId,
      uid: access.uid,
      warehouseId,
    });
    const ledger = await loadCommitLedger(access.companyId, importId);

    await updateImportJob(access.companyId, importId, { status: "committing", error: null });

    const result = await commitImportPlan({
      plan,
      writers,
      ledger,
      deadlineAt: Date.now() + WRITE_BUDGET_MS,
    });

    const done = result.created + result.updated + result.skipped;

    // "Partial" is a real, resumable state and is reported as one: telling
    // someone their import failed when 632 of 710 records landed is both
    // untrue and the fastest way to make them import it all again. It also
    // covers the ordinary case where this call simply ran out of its budget.
    const status = result.remaining > 0 || result.failed.length > 0 ? "partial" : "completed";
    await updateImportJob(access.companyId, importId, {
      status,
      totalActions: result.total,
      processedActions: done,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.failed.length,
      ...(status === "completed" ? { completedAt: new Date() } : {}),
      error: result.failed[0]?.message ?? null,
    });

    return NextResponse.json({
      importId,
      status,
      result,
      progress: { done, total: result.total },
      deferred: stored.job.deferred,
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[migration/commit-plan]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not import the plan" },
      { status: 500 },
    );
  }
}
