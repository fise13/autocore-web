"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FileImage, Smartphone, Sparkles, X } from "lucide-react";

import { useActiveImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { useImportBatchesRealtime } from "@/hooks/use-import-batches-realtime";
import { can } from "@/lib/auth/permissions";
import {
  dismissDocumentImport,
  getDismissedDocumentImportIds,
  markDocumentImportInboxSeen,
} from "@/lib/document-import/inbox-seen";
import { shouldShowDocumentImportTopBarIsland } from "@/lib/document-import/top-bar-island-visibility";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import type { DocumentImportJob } from "@/domain/document-import";
import type { ImportBatch } from "@/domain/import-batch";
import { userCopy } from "@/lib/user-copy";

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

type IslandShellProps = {
  className?: string;
  islandKey: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onOpen: () => void;
  onDismiss: () => void;
  dismissLabel?: string;
};

function MobileImportIslandShell({
  className,
  islandKey,
  icon,
  title,
  subtitle,
  onOpen,
  onDismiss,
  dismissLabel = userCopy.documentImport.hide,
}: IslandShellProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={islandKey}
        layout
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -2 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex max-w-[min(100%,20rem)] items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/[0.08] py-0.5 pl-2 pr-0.5",
          "shadow-sm backdrop-blur-md",
          className,
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full px-1 py-0.5 text-left transition hover:opacity-90"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
            {icon}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">{subtitle}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition",
            "hover:bg-destructive/10 hover:text-destructive",
          )}
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <X className="size-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

type DocumentImportTopBarIslandProps = {
  className?: string;
};

export function DocumentImportTopBarIsland({ className }: DocumentImportTopBarIslandProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const { allowDocumentImportIslandOnDenseChrome, motorImportReviewPending } = useWorkspace();
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

  const visible = shouldShowDocumentImportTopBarIsland({
    pathname,
    canView,
    magicImportActive: Boolean(magicImportActive),
    motorImportReviewActive: motorImportReviewPending,
    allowOnDenseChrome: allowDocumentImportIslandOnDenseChrome,
  });

  if (!visible) return null;

  if (batch) {
    const title =
      batch.status === "processing"
        ? userCopy.documentImport.toastAi
        : batch.status === "review"
          ? userCopy.documentImport.toastRows(batch.counts.rows)
          : userCopy.documentImport.toastFiles(batch.counts.files);

    return (
      <MobileImportIslandShell
        className={className}
        islandKey={batch.id}
        icon={<Sparkles className="size-3" aria-hidden />}
        title={title}
        subtitle={userCopy.documentImport.openConfirm}
        onOpen={() => router.push(`/imports/batch/${batch.id}`)}
        onDismiss={() => {
          setDismissedBatchIds((prev) => new Set(prev).add(batch.id));
        }}
      />
    );
  }

  if (!job) return null;

  const title =
    job.status === "pending"
      ? userCopy.documentImport.phoneProcessing
      : pendingCount > 1
        ? userCopy.documentImport.phonePending(pendingCount)
        : userCopy.documentImport.phoneReady;

  return (
    <MobileImportIslandShell
      className={className}
      islandKey={job.id}
      icon={
        job.status === "pending" ? (
          <Smartphone className="size-3" aria-hidden />
        ) : (
          <FileImage className="size-3" aria-hidden />
        )
      }
      title={title}
      subtitle={
        job.status === "pending"
          ? userCopy.documentImport.preparingPreview
          : job.fileName?.trim()
            ? job.fileName
            : userCopy.documentImport.openSnapshot
      }
      onOpen={() => {
        markDocumentImportInboxSeen();
        router.push(`/imports/${job.id}`);
      }}
      onDismiss={() => {
        dismissDocumentImport(job.id);
        setDismissTick((value) => value + 1);
      }}
      dismissLabel={userCopy.documentImport.dismissUntilNext}
    />
  );
}
