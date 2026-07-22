"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DocumentImportDataPanel } from "@/components/document-import/document-import-data-panel";
import { DocumentImportViewer } from "@/components/document-import/document-import-viewer";
import { HorizontalResizableSplit } from "@/components/document-import/horizontal-resizable-split";
import { useAuth } from "@/components/providers/auth-provider";
import { useDocumentImportImageUrl } from "@/hooks/use-document-import-image-url";
import { useDocumentImportJobRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { useImportBatchRealtime } from "@/hooks/use-import-batches-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { formatDocumentImportToastCopy } from "@/lib/document-import/toast-copy";

type DocumentImportWorkspaceProps = {
  jobId: string;
};

export function DocumentImportWorkspace({ jobId }: DocumentImportWorkspaceProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { job, loading, errorMessage } = useDocumentImportJobRealtime(companyId, jobId);
  const { batch } = useImportBatchRealtime(companyId, jobId, !job && !loading);
  const fallbackUrl = job?.previewDownloadUrl || job?.originalDownloadUrl || null;
  const { url: imageUrl, loading: imageLoading } = useDocumentImportImageUrl(
    job?.id,
    fallbackUrl,
    Boolean(job),
  );

  useEffect(() => {
    if (!loading && !job && batch) {
      router.replace(`/imports/batch/${batch.id}`);
    }
  }, [batch, job, loading, router]);

  const title = job
    ? formatDocumentImportToastCopy(job).title
    : loading
      ? "Загрузка…"
      : "Imported document";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 md:gap-4 md:p-5">
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/imports"
          className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Импорт
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        </div>
      </div>

      {errorMessage ? (
        <div className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {!loading && !job && !batch ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/20">
          <p className="text-sm font-medium">Документ не найден</p>
          <p className="text-xs text-muted-foreground">Проверьте ссылку или права доступа</p>
        </div>
      ) : (
        <HorizontalResizableSplit
          className="min-h-0"
          left={
            <DocumentImportViewer
              imageUrl={imageUrl}
              loading={(loading && !job) || imageLoading}
              className="h-full min-h-0"
            />
          }
          right={
            <DocumentImportDataPanel
              job={job}
              extractedData={job?.extractedData ?? null}
              className="h-full min-h-0"
            />
          }
        />
      )}
    </div>
  );
}
