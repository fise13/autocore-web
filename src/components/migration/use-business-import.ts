"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ingestFiles } from "@/lib/import";
import type { PlanPresentation } from "@/lib/import/business/plan-summary";
import { userCopy } from "@/lib/user-copy";

import {
  analyzeBusinessFile,
  commitBusinessPlan,
  type CommitPlanResponse,
} from "./plan-client";

/**
 * The Business Import wizard, on the plan.
 *
 * What this replaces: a hook that parsed a file, classified every row, handed
 * the person a spreadsheet grid to confirm row by row, and then re-derived
 * create-or-update while writing. The work it asked for was data entry, and
 * the deciding it did during the write is why a resumed run could disagree
 * with itself.
 *
 * The flow now is: parse in the browser, understand on the server, show what
 * will happen, import. The person's only job is the exceptions — and when
 * there are none, there is nothing between them and the button.
 *
 * The plan never enters this file. It is stored server-side against the import
 * id, which is also what makes a failed run resumable: importing again is the
 * same call with the same id.
 */

export type ImportPhase =
  | "idle"
  | "parsing"
  | "analyzing"
  | "ready"
  | "committing"
  | "completed"
  | "partial"
  | "error";

/** What the person is told while the server works. Honest about the stage. */
export const PHASE_MESSAGES: Record<"parsing" | "analyzing" | "committing", string> = {
  parsing: "Читаем файл…",
  analyzing: "AutoCore разбирается в вашем бизнесе — машины, двигатели, детали и связи между ними…",
  committing: "Переносим в AutoCore…",
};

export type UseBusinessImportOptions = {
  companyId?: string;
};

export function useBusinessImport(options: UseBusinessImportOptions) {
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [importId, setImportId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<PlanPresentation | null>(null);
  const [commitResult, setCommitResult] = useState<CommitPlanResponse | null>(null);
  const [mergeDecisions, setMergeDecisions] = useState<Record<string, "accept" | "reject">>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const runIdRef = useRef(0);

  const acceptFiles = useCallback(
    async (files: File[]) => {
      const run = ++runIdRef.current;
      setError(null);
      setCommitResult(null);
      setMergeDecisions({});
      setFileNames(files.map((file) => file.name));
      setPhase("parsing");

      try {
        const ingestion = await ingestFiles(
          files.map((file) => ({ name: file.name, arrayBuffer: () => file.arrayBuffer() })),
        );
        if (run !== runIdRef.current) return;
        if (ingestion.tables.length === 0) {
          setError(userCopy.migration.errors.parseFailed);
          setPhase("error");
          return;
        }

        setPhase("analyzing");
        const id = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const response = await analyzeBusinessFile({
          companyId: options.companyId,
          importId: id,
          tables: ingestion.tables,
          sourceFiles: files.map((file) => file.name),
        });
        if (run !== runIdRef.current) return;

        setImportId(response.importId);
        setPresentation(response.presentation);
        setPhase("ready");
      } catch (caught) {
        if (run !== runIdRef.current) return;
        const raw = caught instanceof Error ? caught.message : "";
        setError(
          raw.includes("Missing or insufficient permissions")
            ? userCopy.migration.errors.permissionDenied
            : raw.trim() || userCopy.migration.errors.parseFailed,
        );
        setPhase("error");
      }
    },
    [options.companyId],
  );

  /** Accept, reject, or leave a proposed merge alone. */
  const decideMerge = useCallback((entityId: string, answer: "accept" | "reject" | "clear") => {
    setMergeDecisions((current) => {
      const next = { ...current };
      if (answer === "clear") delete next[entityId];
      else next[entityId] = answer;
      return next;
    });
  }, []);

  const startImport = useCallback(async () => {
    if (!importId) return;
    setPhase("committing");
    setError(null);
    // The real total, from the plan — never a timer pretending to be progress.
    setProgress({ done: 0, total: presentation?.createTotal ?? 0 });

    try {
      const response = await commitBusinessPlan({
        companyId: options.companyId,
        importId,
        mergeDecisions,
      });
      setCommitResult(response);
      setProgress({
        done: response.result.created + response.result.updated + response.result.skipped,
        total: response.result.created + response.result.updated + response.result.skipped,
      });
      setPhase(response.status === "partial" ? "partial" : "completed");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "";
      setError(
        raw.includes("Missing or insufficient permissions")
          ? userCopy.migration.errors.permissionDenied
          : raw.trim() || userCopy.migration.errors.migrationAborted,
      );
      setPhase("error");
    }
  }, [importId, mergeDecisions, options.companyId, presentation?.createTotal]);

  /**
   * Continue a run that stopped part-way. The same call with the same id:
   * everything already written is skipped by its fingerprint.
   */
  const resumeImport = startImport;

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setPhase("idle");
    setError(null);
    setFileNames([]);
    setImportId(null);
    setPresentation(null);
    setCommitResult(null);
    setMergeDecisions({});
    setProgress(null);
  }, []);

  /** Merges still awaiting an answer — the only thing that can block import. */
  const unansweredMerges = useMemo(() => {
    if (!presentation) return [];
    return presentation.reviewItems.filter(
      (item) =>
        item.reasons.some((reason) => reason.code === "destructive-merge") &&
        !mergeDecisions[item.entityId],
    );
  }, [presentation, mergeDecisions]);

  return {
    phase,
    error,
    fileNames,
    importId,
    presentation,
    commitResult,
    mergeDecisions,
    unansweredMerges,
    progress,
    acceptFiles,
    decideMerge,
    startImport,
    resumeImport,
    reset,
  };
}

export type BusinessImportController = ReturnType<typeof useBusinessImport>;
