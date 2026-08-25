"use client";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { PlanPresentation } from "@/lib/import/business/plan-summary";
import type { CommitPlanResult } from "@/lib/import/business/commit-plan";
import type { ParsedTable } from "@/lib/import";

/**
 * The browser's half of the plan flow.
 *
 * It sends parsed sheets and gets back a summary; it sends an import id and
 * gets back a result. It never holds the plan, and there is deliberately no
 * shape here that could carry one — the plan lives server-side precisely so a
 * client cannot author the document that decides what gets written.
 */

export type AnalyzeResponse = {
  importId: string;
  presentation: PlanPresentation;
};

export type CommitPlanResponse = {
  importId: string;
  status: "completed" | "partial";
  result: CommitPlanResult;
  /**
   * How far the whole import has got, counting everything earlier calls
   * already wrote — not just what this call did. Optional so a client running
   * against an older deployment still works.
   */
  progress?: { done: number; total: number };
  deferred: string[];
};

async function authorizedPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Authorization required");

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error?.trim() || `Request failed (HTTP ${response.status})`);
  }
  return payload as T;
}

export function analyzeBusinessFile(input: {
  companyId?: string;
  importId: string;
  tables: ParsedTable[];
  sourceFiles: string[];
}): Promise<AnalyzeResponse> {
  return authorizedPost<AnalyzeResponse>("/api/migration/analyze", input);
}

/**
 * Import a plan. Safe to call again after a partial run — that is the resume.
 */
export function commitBusinessPlan(input: {
  companyId?: string;
  importId: string;
  mergeDecisions?: Record<string, "accept" | "reject">;
}): Promise<CommitPlanResponse> {
  return authorizedPost<CommitPlanResponse>("/api/migration/commit-plan", input);
}
