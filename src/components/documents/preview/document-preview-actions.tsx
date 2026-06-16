"use client";

import { ArrowLeft, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import {
  deliverPdfToUser,
  fetchDocumentPdf,
  printPdfBlob,
} from "@/lib/documents/fetch-document-pdf";
import { mapDocumentError } from "@/lib/documents/map-document-error";

type DocumentPreviewActionsProps = {
  slug: DocumentSlug;
  orderId: string;
  previewReady?: boolean;
  onError?: (message: string | null) => void;
  onNotice?: (message: string | null) => void;
};

export function DocumentPreviewActions({
  slug,
  orderId,
  previewReady = false,
  onError,
  onNotice,
}: DocumentPreviewActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"download" | "print" | null>(null);
  const definition = DOCUMENT_BY_SLUG[slug];
  const prefetchedBlobRef = useRef<Blob | null>(null);
  const prefetchPromiseRef = useRef<Promise<Blob> | null>(null);

  useEffect(() => {
    if (!previewReady) {
      prefetchedBlobRef.current = null;
      prefetchPromiseRef.current = null;
      return;
    }

    const promise = fetchDocumentPdf(slug, orderId)
      .then((blob) => {
        prefetchedBlobRef.current = blob;
        return blob;
      })
      .catch(() => {
        prefetchedBlobRef.current = null;
        prefetchPromiseRef.current = null;
        throw new Error("prefetch failed");
      });

    prefetchPromiseRef.current = promise;
  }, [previewReady, slug, orderId]);

  async function resolvePdfBlob(): Promise<{ blob: Blob; prefetched: boolean }> {
    if (prefetchedBlobRef.current) {
      return { blob: prefetchedBlobRef.current, prefetched: true };
    }
    if (prefetchPromiseRef.current) {
      try {
        const blob = await prefetchPromiseRef.current;
        return { blob, prefetched: true };
      } catch {
        // Regenerate on demand below.
      }
    }
    const blob = await fetchDocumentPdf(slug, orderId);
    prefetchedBlobRef.current = blob;
    return { blob, prefetched: false };
  }

  async function handleDownload() {
    setBusy("download");
    onError?.(null);
    onNotice?.(null);
    try {
      const { blob, prefetched } = await resolvePdfBlob();
      const filename = `${definition.slug}-${orderId}.pdf`;
      const result = deliverPdfToUser(blob, filename, prefetched ? "instant" : "async");
      if (result === "opened-tab") {
        onNotice?.("PDF открыт в новой вкладке. Сохраните его через меню браузера (⌘S / Ctrl+S).");
      }
    } catch (error) {
      onError?.(mapDocumentError(error, "Не удалось скачать PDF"));
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    setBusy("print");
    onError?.(null);
    onNotice?.(null);
    try {
      const { blob } = await resolvePdfBlob();
      await printPdfBlob(blob);
    } catch (error) {
      onError?.(mapDocumentError(error, "Не удалось напечатать PDF"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-neutral-200 hover:bg-white/10 hover:text-white"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-4" />
        Назад
      </Button>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-medium text-white">{definition.title}</p>
        <p className="text-xs text-neutral-400">Предпросмотр документа</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-[118px] border-white/15 bg-transparent text-neutral-100 hover:bg-white/10 hover:text-white"
          disabled={busy != null || !previewReady}
          onClick={() => void handlePrint()}
        >
          <Printer className="size-4" />
          {busy === "print" ? "Печать…" : "Печать"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-w-[128px] bg-white text-black hover:bg-neutral-200"
          disabled={busy != null || !previewReady}
          onClick={() => void handleDownload()}
        >
          <Download className="size-4" />
          {busy === "download" ? "Скачивание…" : "Скачать PDF"}
        </Button>
      </div>
    </div>
  );
}
