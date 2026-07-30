"use client";

import { useState } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MotorImportJob } from "@/domain/motor-import";
import { MotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { useMotorImportJobsRealtime } from "@/hooks/use-motor-import-jobs-realtime";
import { MotorImportPreviewResult } from "@/lib/motors/import/types";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type MotorImportHistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  importRepository: MotorImportRepository;
  onResume?: (jobId: string, preview: MotorImportPreviewResult) => void;
};

function statusLabels(): Record<string, string> {
  return { ...userCopy.motors.importHistory.status };
}

export function MotorImportHistoryPanel({
  open,
  onOpenChange,
  companyId,
  importRepository,
  onResume,
}: MotorImportHistoryPanelProps) {
  const { jobs, loading, errorMessage } = useMotorImportJobsRealtime(importRepository, companyId, open);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleResume(job: MotorImportJob) {
    if (!onResume) return;
    setBusyJobId(job.id);
    setActionError(null);
    try {
      const engineRows = await importRepository.loadEngineRows(job);
      onResume(job.id, {
        sheets: [],
        sheetMappings: Object.fromEntries(
          job.sheetConfigs.map((config) => [
            config.id,
            {
              config,
              columnMapping: job.columnMappings[config.id] ?? { columnMappings: [], headerRowIndex: null },
              confidence: 1,
              source: "manual" as const,
              warnings: [],
              detectedSoldSheet: false,
            },
          ]),
        ),
        engineRows,
        specificSheets: [],
        stats: job.stats,
      });
      onOpenChange(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : userCopy.motors.importHistory.loadFailed);
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleRollback(job: MotorImportJob) {
    if (!confirm(userCopy.motors.importHistory.rollbackConfirm(job.sourceFileName ?? job.id))) return;
    setBusyJobId(job.id);
    try {
      await importRepository.markRolledBack(job.id, companyId, job.createdByUserId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : userCopy.motors.importHistory.rollbackFailed);
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="z-[100]" className="z-[100] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{userCopy.motors.importHistory.title}</DialogTitle>
          <DialogDescription>{userCopy.motors.importHistory.description}</DialogDescription>
        </DialogHeader>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        <div className="max-h-[420px] space-y-2 overflow-auto">
          {loading ? <p className="text-sm text-muted-foreground">{userCopy.motors.importHistory.loading}</p> : null}
          {!loading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{userCopy.motors.importHistory.empty}</p>
          ) : null}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{job.sourceFileName ?? userCopy.motors.importHistory.fallback}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(job.createdAt, "d MMM yyyy, HH:mm", { locale: enUS })} · {statusLabels()[job.status]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {userCopy.motors.importHistory.stats(job.stats.totalEngineRows, job.stats.validEngineRows)}
                    {job.appliedSummary
                      ? userCopy.motors.importHistory.applied(job.appliedSummary.imported, job.appliedSummary.updated)
                      : null}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {job.status === "preview" && onResume ? (
                    <Button size="sm" variant="outline" disabled={busyJobId === job.id} onClick={() => void handleResume(job)}>
                      {userCopy.motors.importHistory.continue}
                    </Button>
                  ) : null}
                  {job.status === "completed" ? (
                    <Button size="sm" variant="outline" disabled={busyJobId === job.id} onClick={() => void handleRollback(job)}>
                      {userCopy.motors.importHistory.rollback}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
