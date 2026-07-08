"use client";

import { motion } from "framer-motion";

import type { DocumentImportJob } from "@/domain/document-import";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DocumentImportDataPanelProps = {
  job: DocumentImportJob | null;
  /** Reserved for future AI extraction UI — ignore content in v1. */
  extractedData?: unknown | null;
  className?: string;
};

/**
 * Right column shell for Document Import.
 * Replace the placeholder body later without changing the workspace layout.
 */
export function DocumentImportDataPanel({
  job,
  extractedData: _extractedData,
  className,
}: DocumentImportDataPanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex h-full min-h-[420px] flex-col rounded-2xl border bg-card/60 p-6 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Document Data</h2>
          <p className="text-sm text-muted-foreground">Structured fields will appear here</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
          Beta
        </Badge>
      </div>

      <div className="mt-8 flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-10">
        <p className="text-sm font-medium text-foreground">Automatic extraction will be available soon</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Пока документ сохранён для просмотра. Позже здесь появятся распознанные поля без переделки интерфейса.
        </p>
      </div>

      {job ? (
        <div className="mt-6 space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span>Status</span>
            <span className="font-medium text-foreground capitalize">{job.status}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Created</span>
            <span className="font-medium text-foreground">
              {job.createdAt.toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}
    </motion.aside>
  );
}
