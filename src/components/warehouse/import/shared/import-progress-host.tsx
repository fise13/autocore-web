"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Sparkles, X } from "lucide-react";

import {
  MotorImportProgressState,
  WarehouseImportProgressState,
  useWorkspace,
} from "@/components/layout/workspace-context";
import { useMotorImportIslandAction } from "@/components/motors/motor-import-trigger-button";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

export type ActiveImportProgress = {
  progress: MotorImportProgressState | WarehouseImportProgressState;
  onCancel: () => void;
  kind: "motors" | "warehouse";
};

export function useActiveImportProgress(): ActiveImportProgress | null {
  const { motorImportProgress, warehouseImportProgress, cancelMotorImport, cancelWarehouseImport } =
    useWorkspace();

  if (motorImportProgress) {
    return { progress: motorImportProgress, onCancel: cancelMotorImport, kind: "motors" };
  }
  if (warehouseImportProgress) {
    return { progress: warehouseImportProgress, onCancel: cancelWarehouseImport, kind: "warehouse" };
  }
  return null;
}

type ImportProgressCoreProps = {
  progress: ActiveImportProgress["progress"];
  onCancel: () => void;
  variant: "compact" | "panel";
  kind?: ActiveImportProgress["kind"];
  className?: string;
  onIslandClick?: () => void;
};

function phaseLabel(progress: ActiveImportProgress["progress"], kind: ActiveImportProgress["kind"]) {
  if (progress.phase === "apply") {
    return kind === "motors" ? "Загрузка моторов" : "Загрузка склада";
  }
  return "Анализ";
}

export function ImportProgressCore({
  progress,
  onCancel,
  variant,
  kind = "motors",
  className,
  onIslandClick,
}: ImportProgressCoreProps) {
  const [expanded, setExpanded] = useState(false);
  const clamped = Math.max(0, Math.min(100, progress.percent));

  function handleIslandClick() {
    if (variant === "compact") {
      setExpanded((current) => !current);
    }
    onIslandClick?.();
  }

  if (variant === "compact") {
    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "group flex items-center gap-2 rounded-full border border-border/60 bg-background/90 py-1 pl-2.5 pr-1",
            "shadow-sm backdrop-blur-md",
          )}
        >
          <button
            type="button"
            onClick={handleIslandClick}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-full text-left transition",
              "hover:opacity-90",
            )}
          >
            <Sparkles className="size-3 shrink-0 text-primary" aria-hidden />
            <span className="shrink-0 text-[11px] font-medium tracking-[-0.01em] text-foreground">
              {userCopy.motors.magicImport}
            </span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-muted/90 sm:w-28">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${clamped}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 24 }}
              />
            </div>
            <ChevronUp
              className={cn(
                "size-3 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            className={cn(
              "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition",
              "hover:bg-destructive/10 hover:text-destructive",
            )}
            aria-label="Отменить импорт"
            title="Отменить"
          >
            <X className="size-3" />
          </button>
        </div>

        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              className="absolute top-full right-0 z-[100] mt-2 w-72 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-md"
            >
              <p className="text-xs font-medium">{phaseLabel(progress, kind)}</p>
              {progress.fileName ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{progress.fileName}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-muted-foreground">{progress.message ?? "Обработка…"}</p>
              <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">{clamped}%</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className={cn("mc-sidebar-panel overflow-hidden", className)}
    >
      <div className="flex w-full items-center justify-between gap-2 border-b border-border/50 px-3.5 py-2.5">
        <button
          type="button"
          onClick={handleIslandClick}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-90"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">{userCopy.motors.magicImport}</p>
            <p className="text-[11px] text-muted-foreground">{phaseLabel(progress, kind)}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          className="relative z-10 rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Отменить импорт"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="space-y-2 px-3.5 py-3">
        {progress.fileName ? (
          <p className="truncate text-xs text-muted-foreground">{progress.fileName}</p>
        ) : null}
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${clamped}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">{progress.message ?? "Обработка…"}</span>
          <span className="shrink-0 tabular-nums">{clamped}%</span>
        </div>
      </div>
    </motion.section>
  );
}

function ImportReviewIsland({
  review,
  onOpen,
  onDismiss,
  className,
}: {
  review: import("@/components/layout/workspace-context").MotorImportReviewSnapshot;
  onOpen: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  const motorsLabel =
    review.totalMotors > 0
      ? `${review.validMotors > 0 ? review.validMotors : review.totalMotors} моторов`
      : "нет моторов";
  const specificLabel =
    review.specificSheets > 0 ? ` · ${review.specificSheets} специфичных` : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 py-1 pl-2.5 pr-1",
        "shadow-sm backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition hover:opacity-90"
      >
        <Sparkles className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[11px] font-medium text-foreground">
            {userCopy.motors.magicImportReview}
            {review.fileName ? ` · ${review.fileName}` : ""}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {motorsLabel}
            {specificLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition",
          "hover:bg-destructive/10 hover:text-destructive",
        )}
        aria-label="Скрыть"
        title="Скрыть до следующего импорта"
      >
        <X className="size-3" />
      </button>
    </motion.div>
  );
}

export function DashboardImportProgress({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "panel";
  className?: string;
}) {
  const active = useActiveImportProgress();
  const { motorImportReview, dismissMotorImportReview } = useWorkspace();
  const handleIslandAction = useMotorImportIslandAction();

  const showMotorProgress = active?.kind === "motors";
  const showWarehouseProgress = active?.kind === "warehouse";

  return (
    <AnimatePresence mode="wait">
      {showMotorProgress || showWarehouseProgress ? (
        <ImportProgressCore
          key="import-progress"
          progress={active!.progress}
          onCancel={active!.onCancel}
          variant={variant}
          kind={active!.kind}
          className={className}
          onIslandClick={handleIslandAction}
        />
      ) : motorImportReview ? (
        <ImportReviewIsland
          key={`import-review-${motorImportReview.jobId}`}
          review={motorImportReview}
          onOpen={handleIslandAction}
          onDismiss={dismissMotorImportReview}
          className={className}
        />
      ) : null}
    </AnimatePresence>
  );
}

/** Progress pill in the top bar (motors / warehouse Magic Import). */
export function ImportProgressFloater() {
  return null;
}
