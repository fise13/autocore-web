"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileSpreadsheet, PenLine, Sparkles, Upload, X } from "lucide-react";

import {
  MotorImportProgressState,
  MotorImportReviewSnapshot,
} from "@/components/layout/workspace-context";
import { Button } from "@/components/ui/button";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type MotorsImportEmptyLandingProps = {
  canEdit: boolean;
  onImportFile: (file: File) => void | Promise<void>;
  onPickFile: () => void;
  onManualAdd: () => void;
  onOpenReview?: () => void;
  onCancelImport?: () => void;
  progress: MotorImportProgressState | null;
  review: MotorImportReviewSnapshot | null;
  className?: string;
};

function isMotorExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

function phaseTitle(progress: MotorImportProgressState): string {
  return progress.phase === "apply"
    ? userCopy.motors.emptyImportPhaseApply
    : userCopy.motors.emptyImportPhaseAnalyze;
}

function LandingCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MotorsImportEmptyLanding({
  canEdit,
  onImportFile,
  onPickFile,
  onManualAdd,
  onOpenReview,
  onCancelImport,
  progress,
  review,
  className,
}: MotorsImportEmptyLandingProps) {
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null | undefined) => {
      const file = files?.[0];
      if (!file || !isMotorExcelFile(file)) return;
      setBusy(true);
      try {
        await onImportFile(file);
      } finally {
        setBusy(false);
      }
    },
    [onImportFile],
  );

  const showReview = !progress && review;
  const showProgress = Boolean(progress);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-6",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {showProgress && progress ? (
          <motion.div
            key="import-progress"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingCard>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="size-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium">{userCopy.motors.emptyImportProgressTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{phaseTitle(progress)}</p>
                    {progress.fileName ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{progress.fileName}</p>
                    ) : null}
                  </div>
                </div>
                {onCancelImport ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onCancelImport}
                    aria-label="Отменить импорт"
                    title="Отменить импорт"
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <ImportProgressBar percent={progress.percent} className="mt-4" compact />
              {progress.message ? (
                <p className="mt-2 text-left text-xs text-muted-foreground">{progress.message}</p>
              ) : null}
              <p className="mt-3 text-left text-[11px] leading-relaxed text-muted-foreground">
                {userCopy.motors.emptyImportProgressHint}
              </p>
            </LandingCard>
          </motion.div>
        ) : showReview && review ? (
          <motion.div
            key="import-review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingCard>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium">{userCopy.motors.emptyImportReviewTitle}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {review.fileName ?? userCopy.motors.magicImport}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {review.validMotors > 0 ? review.validMotors : review.totalMotors} моторов
                    {review.specificSheets > 0 ? ` · ${review.specificSheets} спец. листов` : ""}
                  </p>
                </div>
              </div>
              <Button type="button" className="mt-4 w-full" size="sm" onClick={onOpenReview}>
                {userCopy.motors.emptyImportReviewAction}
              </Button>
            </LandingCard>
          </motion.div>
        ) : canEdit ? (
          <motion.div
            key="import-idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingCard>
              <div className="text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
                  <FileSpreadsheet className="size-4 text-primary" aria-hidden />
                </div>
                <h2 className="text-base font-semibold tracking-tight">{userCopy.motors.emptyTitle}</h2>
                <p className="mx-auto mt-1.5 max-w-[28rem] text-xs leading-relaxed text-muted-foreground">
                  {userCopy.motors.emptyDescription}
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPickFile();
                  }
                }}
                onClick={() => onPickFile()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  void handleFiles(event.dataTransfer.files);
                }}
                className={cn(
                  "group mt-5 flex cursor-pointer flex-col items-center rounded-lg border border-dashed px-4 py-5 text-center transition",
                  dragActive
                    ? "border-primary/60 bg-primary/8"
                    : "border-border/80 bg-muted/15 hover:border-primary/35 hover:bg-muted/25",
                  busy && "pointer-events-none opacity-60",
                )}
              >
                <Upload
                  className={cn(
                    "size-5 text-muted-foreground transition group-hover:text-primary",
                    dragActive && "text-primary",
                  )}
                  aria-hidden
                />
                <p className="mt-2 text-sm font-medium">{userCopy.motors.emptyImport}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{userCopy.motors.emptyImportDropHint}</p>
              </div>

              <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={busy}
                  onClick={() => onPickFile()}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  {userCopy.motors.emptyImport}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={onManualAdd}
                >
                  <PenLine className="size-3.5" aria-hidden />
                  {userCopy.motors.emptyCreate}
                </Button>
              </div>

              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground/80">
                {userCopy.motors.emptyImportAiHint}
              </p>

              <div className="mt-4 border-t pt-3">
                <Link
                  href="/migration"
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  Переносите целый бизнес? Откройте миграцию
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </LandingCard>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
