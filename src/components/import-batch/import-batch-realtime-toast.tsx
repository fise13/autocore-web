"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import type { ImportBatch } from "@/domain/import-batch";
import { useImportBatchesRealtime } from "@/hooks/use-import-batches-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

function BatchToastCard({
  batch,
  toastId,
  onOpen,
}: {
  batch: ImportBatch;
  toastId: string | number;
  onOpen: () => void;
}) {
  const title =
    batch.status === "processing"
      ? userCopy.importBatch.toastAi
      : batch.status === "review"
        ? userCopy.importBatch.toastReady
        : userCopy.importBatch.toastNew;
  const description = userCopy.importBatch.toastFilesRows(batch.counts.files, batch.counts.rows);

  return (
    <div
      className={cn(
        "relative flex w-[min(100vw-2rem,22rem)] items-stretch gap-3 overflow-hidden rounded-2xl border border-border/80",
        "bg-card p-3 pr-10 shadow-lg",
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Sparkles className="size-5" aria-hidden />
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
          {userCopy.importBatch.open}
        </button>
      </div>
      <button
        type="button"
        aria-label={userCopy.importBatch.closeAria}
        onClick={() => sonnerToast.dismiss(toastId)}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Toast when a new import batch appears or becomes ready for review. */
export function ImportBatchRealtimeToast() {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { batches } = useImportBatchesRealtime(companyId, Boolean(companyId));
  const seenRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    seenRef.current = new Set();
    bootstrappedRef.current = false;
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    if (!bootstrappedRef.current) {
      for (const batch of batches) {
        seenRef.current.add(`${batch.id}:${batch.status}:${batch.counts.files}`);
      }
      bootstrappedRef.current = true;
      return;
    }

    for (const batch of batches) {
      const key = `${batch.id}:${batch.status}:${batch.counts.files}`;
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);

      if (!["collecting", "processing", "review"].includes(batch.status)) continue;
      if (batch.counts.files === 0) continue;

      const id = batch.id;
      sonnerToast.custom(
        (toastId) => (
          <BatchToastCard
            batch={batch}
            toastId={toastId}
            onOpen={() => router.push(`/imports/batch/${id}`)}
          />
        ),
        {
          duration: 12_000,
          unstyled: true,
          className: "p-0! bg-transparent! border-0! shadow-none!",
        },
      );
    }
  }, [batches, companyId, router]);

  return null;
}
