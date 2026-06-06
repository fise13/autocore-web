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
        <motion.button
          type="button"
          layout
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleIslandClick}
          className={cn(
            "group flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-2.5 py-1",
            "shadow-sm backdrop-blur-md transition hover:border-primary/40 hover:bg-background",
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
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                onCancel();
              }
            }}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition",
              "opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100",
            )}
            aria-label="Отменить импорт"
            title="Отменить"
          >
            <X className="size-3" />
          </span>
        </motion.button>

        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-md"
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
      <button
        type="button"
        onClick={handleIslandClick}
        className="flex w-full items-center justify-between gap-2 border-b border-border/50 px-3.5 py-2.5 text-left transition hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">{userCopy.motors.magicImport}</p>
            <p className="text-[11px] text-muted-foreground">{phaseLabel(progress, kind)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Отменить импорт"
        >
          <X className="size-3.5" />
        </button>
      </button>
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
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1",
        "shadow-sm backdrop-blur-md transition hover:border-amber-500/60",
        className,
      )}
    >
      <Sparkles className="size-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <span className="shrink-0 text-[11px] font-medium text-amber-800 dark:text-amber-200">
        {userCopy.motors.magicImportReview}
      </span>
    </motion.button>
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
  const { motorImportReviewPending } = useWorkspace();
  const handleIslandAction = useMotorImportIslandAction();

  return (
    <AnimatePresence mode="wait">
      {active ? (
        <ImportProgressCore
          key="import-progress"
          progress={active.progress}
          onCancel={active.onCancel}
          variant={variant}
          kind={active.kind}
          className={className}
          onIslandClick={handleIslandAction}
        />
      ) : motorImportReviewPending ? (
        <ImportReviewIsland
          key="import-review"
          onClick={handleIslandAction}
          className={className}
        />
      ) : null}
    </AnimatePresence>
  );
}
