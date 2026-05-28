"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

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

type MotorImportHistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  importRepository: MotorImportRepository;
  onResume?: (jobId: string, preview: MotorImportPreviewResult) => void;
};

const statusLabels: Record<MotorImportJob["status"], string> = {
  preview: "Предпросмотр",
  applying: "Применение",
  completed: "Завершён",
  failed: "Ошибка",
  cancelled: "Отменён",
  rolled_back: "Откачен",
};

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
      setActionError(error instanceof Error ? error.message : "Не удалось загрузить импорт");
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleRollback(job: MotorImportJob) {
    if (!confirm(`Отметить импорт «${job.sourceFileName ?? job.id}» как откаченный?`)) return;
    setBusyJobId(job.id);
    try {
      await importRepository.markRolledBack(job.id, companyId, job.createdByUserId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось откатить");
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>История импортов моторов</DialogTitle>
          <DialogDescription>Последние импорты Excel с возможностью продолжить preview.</DialogDescription>
        </DialogHeader>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        <div className="max-h-[420px] space-y-2 overflow-auto">
          {loading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
          {!loading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Импортов пока нет.</p>
          ) : null}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{job.sourceFileName ?? "Импорт моторов"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(job.createdAt, "d MMM yyyy, HH:mm", { locale: ru })} · {statusLabels[job.status]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Строк: {job.stats.totalEngineRows} · валидных: {job.stats.validEngineRows}
                    {job.appliedSummary
                      ? ` · импорт: ${job.appliedSummary.imported} · обновлено: ${job.appliedSummary.updated}`
                      : null}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {job.status === "preview" && onResume ? (
                    <Button size="sm" variant="outline" disabled={busyJobId === job.id} onClick={() => void handleResume(job)}>
                      Продолжить
                    </Button>
                  ) : null}
                  {job.status === "completed" ? (
                    <Button size="sm" variant="outline" disabled={busyJobId === job.id} onClick={() => void handleRollback(job)}>
                      Откатить
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
