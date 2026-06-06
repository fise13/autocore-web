"use client";

import { ArrowLeft, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";

type DocumentPreviewActionsProps = {
  slug: DocumentSlug;
  orderId: string;
};

export function DocumentPreviewActions({ slug, orderId }: DocumentPreviewActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"download" | "print" | null>(null);
  const definition = DOCUMENT_BY_SLUG[slug];

  async function handleDownload() {
    setBusy("download");
    try {
      await downloadDocumentPdf(slug, orderId, `${definition.slug}-${orderId}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    setBusy("print");
    try {
      await printDocumentPdf(slug, orderId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Назад
      </Button>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-medium">{definition.title}</p>
        <p className="text-xs text-neutral-500">Предпросмотр документа</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy != null} onClick={handlePrint}>
          <Printer className="size-4" />
          {busy === "print" ? "…" : "Печать PDF"}
        </Button>
        <Button type="button" size="sm" disabled={busy != null} onClick={handleDownload}>
          <Download className="size-4" />
          {busy === "download" ? "…" : "Скачать PDF"}
        </Button>
      </div>
    </div>
  );
}
