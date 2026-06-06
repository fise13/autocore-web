"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import { cn } from "@/lib/utils";

type ImportProgressBannerProps = {
  progress: {
    phase: "analyze" | "apply";
    percent: number;
    message: string;
    fileName?: string;
  } | null;
  onCancel: () => void;
  titleAnalyze: string;
  titleApply: string;
};

export function ImportProgressBanner({
  progress,
  onCancel,
  titleAnalyze,
  titleApply,
}: ImportProgressBannerProps) {
  return (
    <AnimatePresence>
      {progress ? (
        <motion.div
          key="import-progress"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="border-b bg-primary/5 px-4 py-2"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {progress.phase === "apply" ? titleApply : titleAnalyze}
                {progress.fileName ? ` · ${progress.fileName}` : ""}
              </p>
              <ImportProgressBar
                percent={progress.percent}
                message={progress.message}
                compact
                className="mt-1"
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {progress.percent}%
            </span>
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition",
                "hover:bg-destructive/10 hover:text-destructive",
              )}
              aria-label="Отменить импорт"
              title="Отменить импорт"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function WarehouseImportProgressBanner() {
  const { warehouseImportProgress, cancelWarehouseImport } = useWorkspace();

  return (
    <ImportProgressBanner
      progress={warehouseImportProgress}
      onCancel={cancelWarehouseImport}
      titleAnalyze="Magic Import"
      titleApply="Загрузка в базу"
    />
  );
}

export function MotorImportProgressBanner() {
  const { motorImportProgress, cancelMotorImport } = useWorkspace();

  return (
    <ImportProgressBanner
      progress={motorImportProgress}
      onCancel={cancelMotorImport}
      titleAnalyze="Импорт моторов"
      titleApply="Загрузка моторов"
    />
  );
}
