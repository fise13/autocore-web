"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, Sparkles, X } from "lucide-react";

import { useActiveImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { useImportBatchesRealtime } from "@/hooks/use-import-batches-realtime";
import { can } from "@/lib/auth/permissions";
import {
  dismissDocumentImport,
  getDismissedDocumentImportIds,
  markDocumentImportInboxSeen,
} from "@/lib/document-import/inbox-seen";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import type { DocumentImportJob } from "@/domain/document-import";
import type { ImportBatch } from "@/domain/import-batch";

function pickTopBarJob(jobs: DocumentImportJob[], dismissed: Set<string>): DocumentImportJob | null {
  const candidates = jobs.filter(
    (job) =>
      !dismissed.has(job.id) &&
      (job.status === "ready" || job.status === "pending"),
  );
  if (candidates.length === 0) return null;
  return candidates[0] ?? null;
}

function pickTopBarBatch(batches: ImportBatch[]): ImportBatch | null {
  const candidates = batches.filter(
    (batch) =>
      ["collecting", "processing", "review"].includes(batch.status) && batch.counts.files > 0,
  );
  return candidates[0] ?? null;
}

type DocumentImportTopBarIslandProps = {
  className?: string;
};

export function DocumentImportTopBarIsland({ className }: DocumentImportTopBarIslandProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canView = can(profile, "inventory_view");
  const magicImportActive = useActiveImportProgress();
  const { jobs } = useDocumentImportJobsRealtime(companyId, canView);
  const { batches } = useImportBatchesRealtime(companyId, canView);
  const [dismissTick, setDismissTick] = useState(0);
  const [dismissedBatchIds, setDismissedBatchIds] = useState<Set<string>>(new Set());
  const dismissed = useMemo(() => getDismissedDocumentImportIds(), [dismissTick]);

  const batch = useMemo(() => {
    const picked = pickTopBarBatch(batches);
    if (!picked || dismissedBatchIds.has(picked.id)) return null;
    return picked;
  }, [batches, dismissedBatchIds]);
  const job = useMemo(() => pickTopBarJob(jobs, dismissed), [dismissed, jobs]);
  const pendingCount = useMemo(
    () =>
      jobs.filter(
        (entry) =>
          !dismissed.has(entry.id) &&
          (entry.status === "ready" || entry.status === "pending"),
      ).length,
    [dismissed, jobs],
  );

  if (!canView || magicImportActive) return null;

  if (batch) {
    const title =
      batch.status === "processing"
        ? "Импорт · AI разбирает"
        : batch.status === "review"
          ? `Импорт · ${batch.counts.rows} строк к проверке`
          : `Импорт · ${batch.counts.files} файл.`;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={batch.id}
          layout
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -2 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 py-1 pl-2.5 pr-1",
            "shadow-sm backdrop-blur-md",
            className,
          )}
        >
          <button
            type="button"
            onClick={() => router.push(`/imports/batch/${batch.id}`)}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition hover:opacity-90"
          >
            <Sparkles className="size-3 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[11px] font-medium tracking-[-0.01em] text-foreground">
                {title}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                Откройте и подтвердите импорт
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDismissedBatchIds((prev) => new Set(prev).add(batch.id));
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition",
              "hover:bg-destructive/10 hover:text-destructive",
            )}
            aria-label="Скрыть уведомление"
          >
            <X className="size-3" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!job) return null;

  const title =
    job.status === "pending"
      ? "Mobile Import · обрабатывается"
      : pendingCount > 1
        ? `Mobile Import · ${pendingCount} готовы к проверке`
        : "Mobile Import · готов к проверке";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={job.id}
        layout
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -2 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 py-1 pl-2.5 pr-1",
          "shadow-sm backdrop-blur-md",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => {
            markDocumentImportInboxSeen();
            router.push(`/imports/${job.id}`);
          }}
          className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition hover:opacity-90"
        >
          <FileImage className="size-3 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[11px] font-medium tracking-[-0.01em] text-foreground">
              {title}
              {job.fileName ? ` · ${job.fileName}` : ""}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {job.status === "pending" ? "Готовим превью документа" : "Откройте и проверьте снимок"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            dismissDocumentImport(job.id);
            setDismissTick((value) => value + 1);
          }}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition",
            "hover:bg-destructive/10 hover:text-destructive",
          )}
          aria-label="Скрыть уведомление"
          title="Скрыть до следующего импорта"
        >
          <X className="size-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
