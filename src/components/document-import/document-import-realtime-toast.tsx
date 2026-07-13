"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Smartphone, X } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import type { DocumentImportJob } from "@/domain/document-import";
import { formatDocumentImportToastCopy } from "@/lib/document-import/toast-copy";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";

function DocumentImportToastCard({
  job,
  toastId,
  onOpen,
}: {
  job: DocumentImportJob;
  toastId: string | number;
  onOpen: () => void;
}) {
  const { title, description } = formatDocumentImportToastCopy(job);
  const preview = job.previewDownloadUrl?.trim() || job.originalDownloadUrl?.trim() || null;
  const isImage = job.contentType.startsWith("image/");

  return (
    <div
      className={cn(
        "relative flex w-[min(100vw-2rem,22rem)] items-stretch gap-3 overflow-hidden rounded-2xl border border-border/80",
        "bg-card p-3 pr-10 shadow-lg",
      )}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {preview && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Storage URL in ephemeral toast
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {isImage ? <ImageIcon className="size-5" aria-hidden /> : <Smartphone className="size-5" aria-hidden />}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{description}</p>
        <button
          type="button"
          onClick={() => {
            onOpen();
            sonnerToast.dismiss(toastId);
          }}
          className="mt-2.5 inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Открыть
        </button>
      </div>

      <button
        type="button"
        aria-label="Закрыть"
        onClick={() => sonnerToast.dismiss(toastId)}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Realtime toast when a document import job appears for the company.
 */
export function DocumentImportRealtimeToast() {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { jobs } = useDocumentImportJobsRealtime(companyId, Boolean(companyId));
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    seenIdsRef.current = new Set();
    bootstrappedRef.current = false;
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    if (!bootstrappedRef.current) {
      for (const job of jobs) {
        seenIdsRef.current.add(job.id);
      }
      bootstrappedRef.current = true;
      return;
    }

    for (const job of jobs) {
      if (seenIdsRef.current.has(job.id)) continue;
      seenIdsRef.current.add(job.id);

      if (job.status !== "ready" && job.status !== "pending") continue;

      const jobId = job.id;
      sonnerToast.custom(
        (toastId) => (
          <DocumentImportToastCard
            job={job}
            toastId={toastId}
            onOpen={() => router.push(`/imports/${jobId}`)}
          />
        ),
        {
          duration: 12_000,
          unstyled: true,
          className: "p-0! bg-transparent! border-0! shadow-none!",
        },
      );
    }
  }, [companyId, jobs, router]);

  return null;
}
