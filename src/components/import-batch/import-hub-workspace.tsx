"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FileUp, Plus, Smartphone, Sparkles } from "lucide-react";

import type { ImportBatch, ImportBatchStatus } from "@/domain/import-batch";
import { DocumentImportsList } from "@/components/document-import/document-imports-list";
import { ImportPhoneQrSheet } from "@/components/import-batch/import-phone-qr-sheet";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentImportJobsRealtime } from "@/hooks/use-document-import-jobs-realtime";
import { useImportBatchesRealtime } from "@/hooks/use-import-batches-realtime";
import {
  createImportBatchClient,
  uploadImportBatchFileClient,
} from "@/lib/import-batch/fetch-import-batches.client";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

const STATUS_LABELS: Record<ImportBatchStatus, string> = {
  collecting: userCopy.importBatch.status.collecting,
  processing: userCopy.importBatch.status.processing,
  review: userCopy.importBatch.status.review,
  applying: userCopy.importBatch.status.applying,
  completed: userCopy.importBatch.status.completed,
  failed: userCopy.importBatch.status.failed,
  expired: userCopy.importBatch.status.expired,
  cancelled: userCopy.importBatch.status.cancelled,
};

export function ImportHubWorkspace() {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { batches, loading, errorMessage } = useImportBatchesRealtime(companyId);
  const {
    jobs: legacyJobs,
    loading: legacyLoading,
    errorMessage: legacyError,
  } = useDocumentImportJobsRealtime(companyId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [phoneBatchId, setPhoneBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startBatch(andOpenPhone = false) {
    setCreating(true);
    setError(null);
    try {
      const batch = await createImportBatchClient({ target: "motors" });
      if (andOpenPhone) {
        setPhoneBatchId(batch.id);
      } else {
        router.push(`/imports/batch/${batch.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : userCopy.importBatch.createFailed);
    } finally {
      setCreating(false);
    }
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    setCreating(true);
    setError(null);
    try {
      const batch = await createImportBatchClient({ target: "motors" });
      for (const file of Array.from(fileList)) {
        await uploadImportBatchFileClient({ batchId: batch.id, file });
      }
      router.push(`/imports/batch/${batch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : userCopy.importBatch.uploadFilesFailed);
    } finally {
      setCreating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-8 overflow-y-auto p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{userCopy.importBatch.hubTitle}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {userCopy.importBatch.hubDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => void startBatch(true)}
          >
            <Smartphone className="size-4" />
            {userCopy.importBatch.fromPhone}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => {
              void (async () => {
                setCreating(true);
                setError(null);
                try {
                  const batch = await createImportBatchClient({ target: "warehouse" });
                  router.push(`/imports/batch/${batch.id}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : userCopy.importBatch.createFailed);
                } finally {
                  setCreating(false);
                }
              })();
            }}
          >
            {userCopy.importBatch.warehouse}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="size-4" />
            {userCopy.importBatch.files}
          </Button>
          <Button type="button" disabled={creating} onClick={() => void startBatch(false)}>
            <Plus className="size-4" />
            {userCopy.importBatch.newSession}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            multiple
            className="hidden"
            onChange={(event) => void onFilesSelected(event.target.files)}
          />
        </div>
      </div>

      {(error || errorMessage) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || errorMessage}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-muted-foreground" />
          {userCopy.importBatch.sessionsTitle}
        </div>

        {loading && batches.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <p className="text-sm font-medium">{userCopy.importBatch.sessionsEmptyTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {userCopy.importBatch.sessionsEmptyHint}
            </p>
            <Button type="button" disabled={creating} onClick={() => void startBatch(true)}>
              {userCopy.importBatch.startFromPhone}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <BatchListRow key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </section>

      {legacyJobs.length > 0 || legacyLoading ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{userCopy.importBatch.earlierFromPhone}</h2>
          <DocumentImportsList
            jobs={legacyJobs}
            loading={legacyLoading}
            errorMessage={legacyError}
            emptyHint=""
          />
        </section>
      ) : null}

      <ImportPhoneQrSheet
        batchId={phoneBatchId}
        open={Boolean(phoneBatchId)}
        onOpenChange={(open) => {
          if (!open) {
            const id = phoneBatchId;
            setPhoneBatchId(null);
            if (id) router.push(`/imports/batch/${id}`);
          }
        }}
      />
    </div>
  );
}

function BatchListRow({ batch }: { batch: ImportBatch }) {
  return (
    <Link
      href={`/imports/batch/${batch.id}`}
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card/70 px-4 py-3 transition-colors hover:bg-accent/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {batch.title || userCopy.importBatch.sessionTitle(STATUS_LABELS[batch.status])}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {userCopy.importBatch.toastFilesRows(batch.counts.files, batch.counts.rows)} ·{" "}
          {formatDistanceToNow(batch.createdAt, { addSuffix: true, locale: ru })}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
        {STATUS_LABELS[batch.status]}
      </span>
    </Link>
  );
}
