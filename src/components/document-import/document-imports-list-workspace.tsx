"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";

export function DocumentImportsListWorkspace() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { jobs, loading, errorMessage } = useDocumentImportJobsRealtime(companyId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Imports</h1>
        <p className="text-sm text-muted-foreground">
          Документы, загруженные с мобильного. Просмотр и — позже — автоматическое извлечение данных.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!loading && jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <div className="rounded-full bg-muted p-3">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Пока нет импортов</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Откройте Import на мобилке (экран Scan → Import), сфотографируйте документ и отправьте.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {jobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.22 }}
          >
            <Link
              href={`/imports/${job.id}`}
              className={cn(
                "flex items-center gap-4 rounded-xl border bg-card/70 px-4 py-3 transition-colors hover:bg-accent/40",
              )}
            >
              <div className="flex size-11 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {job.previewDownloadUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={job.previewDownloadUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {job.fileName?.trim() || "Document"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {job.status} ·{" "}
                  {formatDistanceToNow(job.createdAt, { addSuffix: true, locale: ru })}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
