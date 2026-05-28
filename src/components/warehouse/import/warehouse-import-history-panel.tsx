"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { rollbackImportJobUseCase } from "@/application/use-cases/warehouse/rollback-import-job";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryImportJob } from "@/domain/inventory-import";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { useImportJobsRealtime } from "@/hooks/use-import-jobs-realtime";
import { cn } from "@/lib/utils";

type WarehouseImportHistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  actorUserId: string;
  importRepository: InventoryImportRepository;
  itemRepository: InventoryItemRepository;
  stockLevelRepository: InventoryStockLevelRepository;
  movementRepository: InventoryMovementRepository;
  financialRepository: FinancialOperationRepository;
  onResume?: (job: InventoryImportJob, rows: InventoryImportJob["rows"]) => void;
};

const statusLabels: Record<InventoryImportJob["status"], string> = {
  parsing: "Разбор",
  preview: "Предпросмотр",
  applying: "Применение",
  completed: "Завершён",
  failed: "Ошибка",
  cancelled: "Отменён",
  rolled_back: "Откачен",
};

function statusTone(status: InventoryImportJob["status"]) {
  switch (status) {
    case "completed":
      return "text-emerald-700";
    case "failed":
    case "rolled_back":
      return "text-destructive";
    case "applying":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

export function WarehouseImportHistoryPanel({
  open,
  onOpenChange,
  companyId,
  actorUserId,
  importRepository,
  itemRepository,
  stockLevelRepository,
  movementRepository,
  financialRepository,
  onResume,
}: WarehouseImportHistoryPanelProps) {
  const { jobs, loading, errorMessage } = useImportJobsRealtime(importRepository, companyId, open);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRollback(job: InventoryImportJob) {
    if (!confirm(`Откатить импорт «${job.sourceFileName ?? job.id}»? Остатки будут скорректированы.`)) {
      return;
    }
    setBusyJobId(job.id);
    setActionError(null);
    try {
      await rollbackImportJobUseCase(
        importRepository,
        itemRepository,
        stockLevelRepository,
        movementRepository,
        financialRepository,
        { companyId, jobId: job.id, actorUserId },
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось откатить импорт");
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleResume(job: InventoryImportJob) {
    if (!onResume) return;
    setBusyJobId(job.id);
    setActionError(null);
    try {
      const rows = await importRepository.loadRows(job);
      onResume(job, rows);
      onOpenChange(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось загрузить импорт");
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>История импортов</DialogTitle>
          <DialogDescription>Последние загрузки склада с возможностью отката и продолжения.</DialogDescription>
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.sourceFileName ?? "Импорт"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(job.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
                    {" · "}
                    <span className={cn(statusTone(job.status))}>{statusLabels[job.status]}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Строк: {job.stats.total} · валидных: {job.stats.valid}
                    {job.appliedSummary
                      ? ` · применено: ${job.appliedSummary.applied}`
                      : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {job.status === "preview" && onResume ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyJobId === job.id}
                      onClick={() => void handleResume(job)}
                    >
                      Продолжить
                    </Button>
                  ) : null}
                  {job.status === "completed" && (job.rollbackMovementIds?.length ?? 0) > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyJobId === job.id}
                      onClick={() => void handleRollback(job)}
                    >
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
