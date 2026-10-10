"use client";

import { useState } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

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
import { userCopy } from "@/lib/user-copy";
import { inventoryImportStatusStyle, statusToneTextClass } from "@/lib/status/status-tones";

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

function statusLabels(): Record<InventoryImportJob["status"], string> {
  return { ...userCopy.warehouse.import.jobStatus };
}

function statusTone(status: InventoryImportJob["status"]) {
  return statusToneTextClass[inventoryImportStatusStyle[status].tone];
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
    if (!confirm(userCopy.warehouse.import.rollbackConfirm(job.sourceFileName ?? job.id))) {
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
      setActionError(error instanceof Error ? error.message : userCopy.warehouse.import.rollbackFailed);
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
      setActionError(error instanceof Error ? error.message : userCopy.warehouse.import.loadFailed);
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{userCopy.warehouse.import.historyTitle}</DialogTitle>
          <DialogDescription>{userCopy.warehouse.import.historyDescription}</DialogDescription>
        </DialogHeader>

        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

        <div className="max-h-[420px] space-y-2 overflow-auto">
          {loading ? <p className="text-sm text-muted-foreground">{userCopy.warehouse.loading}</p> : null}
          {!loading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{userCopy.warehouse.import.historyEmpty}</p>
          ) : null}

          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.sourceFileName ?? userCopy.warehouse.import.historyFallback}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(job.createdAt, "d MMM yyyy, HH:mm", { locale: enUS })}
                    {" · "}
                    <span className={cn(statusTone(job.status))}>{statusLabels()[job.status]}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {userCopy.warehouse.import.historyStats(job.stats.total, job.stats.valid)}
                    {job.appliedSummary
                      ? userCopy.warehouse.import.historyApplied(job.appliedSummary.applied)
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
                      {userCopy.warehouse.import.continue}
                    </Button>
                  ) : null}
                  {job.status === "completed" && (job.rollbackMovementIds?.length ?? 0) > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyJobId === job.id}
                      onClick={() => void handleRollback(job)}
                    >
                      {userCopy.warehouse.import.rollback}
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
