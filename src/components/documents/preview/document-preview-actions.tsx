"use client";

import { ArrowLeft, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { userCopy } from "@/lib/user-copy";

import { Button } from "@/components/ui/button";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import {
  deliverPdfToUser,
  fetchDocumentPdf,
  printPdfBlob,
} from "@/lib/documents/fetch-document-pdf";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import { registerDesktopAction } from "@/platform/desktop-actions";

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
      const { blob } = await resolvePdfBlob();
      const filename = `${definition.slug}-${orderId}.pdf`;
      const result = await deliverPdfToUser(blob, filename);
      // On desktop the file goes where the user chose, so say where that was.
      // "cancelled" means they dismissed the dialog — not an error, not a notice.
      if (result.status === "saved") {
        onNotice?.(userCopy.documents.preview.savedTo(result.path));
      }
    } catch (error) {
      onError?.(mapDocumentError(error, userCopy.documents.preview.downloadFailed));
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
      await printPdfBlob(blob, `${definition.slug}-${orderId}.pdf`);
    } catch (error) {
      onError?.(mapDocumentError(error, userCopy.documents.preview.printFailed));
    } finally {
      setBusy(null);
    }
  }

  // Claim ⌘S / ⌘P from the desktop menu while this screen is on top. A no-op on
  // web, where the browser owns both shortcuts.
  useEffect(() => {
    const releaseSave = registerDesktopAction("save", () => void handleDownload());
    const releasePrint = registerDesktopAction("print", () => void handlePrint());
    return () => {
      releaseSave();
      releasePrint();
    };
    // handleDownload / handlePrint close over refs and stable props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderId]);

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-neutral-200 hover:bg-white/10 hover:text-white"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length <= 1) {
            window.close();
            return;
          }
          router.back();
        }}
      >
        <ArrowLeft className="size-4" />
        {userCopy.documents.preview.close}
      </Button>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-medium text-white">{definition.title}</p>
        <p className="text-xs text-neutral-400">{userCopy.documents.preview.documentPreview}</p>
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
          {busy === "print" ? userCopy.documents.preview.printing : userCopy.documents.preview.print}
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-w-[128px] bg-white text-black hover:bg-neutral-200"
          disabled={busy != null || !previewReady}
          onClick={() => void handleDownload()}
        >
          <Download className="size-4" />
          {busy === "download" ? userCopy.documents.preview.downloading : userCopy.documents.preview.downloadPdf}
        </Button>
      </div>
    </div>
  );
}
