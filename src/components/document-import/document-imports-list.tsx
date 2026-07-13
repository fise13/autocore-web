"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FileText } from "lucide-react";

import type { DocumentImportJob, DocumentImportStatus } from "@/domain/document-import";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<DocumentImportStatus, string> = {
  pending: "Обработка",
  ready: "Готов",
  imported: "Импортирован",
  failed: "Ошибка",
};

type DocumentImportsListProps = {
  jobs: DocumentImportJob[];
  loading?: boolean;
  errorMessage?: string | null;
  emptyHint?: string;
  onItemClick?: () => void;
  compact?: boolean;
};

export function DocumentImportsList({
  jobs,
  loading = false,
  errorMessage = null,
  emptyHint = "Откройте Import на мобилке (Scan → Import), сфотографируйте документ и отправьте.",
  onItemClick,
  compact = false,
}: DocumentImportsListProps) {
  if (errorMessage) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
          <Skeleton key={index} className={cn("w-full rounded-xl", compact ? "h-14" : "h-16")} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 text-center",
          compact ? "px-4 py-10" : "px-6 py-16",
        )}
      >
        <div className="rounded-full bg-muted p-3">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Пока нет импортов</p>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/imports/${job.id}`}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-4 rounded-xl border bg-card/70 px-4 transition-colors hover:bg-accent/40",
            compact ? "py-2.5" : "py-3",
          )}
        >
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {job.previewDownloadUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.previewDownloadUrl} alt="" className="size-full object-cover" />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {job.fileName?.trim() || "Документ"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {STATUS_LABELS[job.status]} ·{" "}
              {formatDistanceToNow(job.createdAt, { addSuffix: true, locale: ru })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
