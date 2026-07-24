"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { userCopy } from "@/lib/user-copy";

import { RenderDocument } from "@/components/documents/registry/render-document";
import { DocumentPreviewFrame } from "@/components/documents/preview/document-preview-frame";
import { Button } from "@/components/ui/button";
import { DOCUMENT_BY_SLUG, type DocumentSlug } from "@/lib/documents/document-types";
import { printPreviewInBrowser } from "@/lib/documents/preview-document-output";
import { getDemoDocumentContext } from "@/lib/marketing/demo-document-context";

type DocumentTemplatePreviewClientProps = {
  slug: DocumentSlug;
};

function closePreviewTab() {
  if (typeof window === "undefined") return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.close();
}

export function DocumentTemplatePreviewClient({ slug }: DocumentTemplatePreviewClientProps) {
  const definition = DOCUMENT_BY_SLUG[slug];
  const context = getDemoDocumentContext();

  return (
    <DocumentPreviewFrame
      toolbar={
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-200 hover:bg-white/10 hover:text-white"
            onClick={closePreviewTab}
          >
            <ArrowLeft className="size-4" />
            {userCopy.documents.preview.close}
          </Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-medium text-white">{definition.title}</p>
            <p className="text-xs text-neutral-400">{userCopy.documents.preview.templatePreview}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-[118px] border-white/15 bg-transparent text-neutral-100 hover:bg-white/10 hover:text-white"
            onClick={() => printPreviewInBrowser()}
          >
            <Printer className="size-4" />
            {userCopy.documents.preview.print}
          </Button>
        </div>
      }
    >
      <div
        id="doc-preview-print-root"
        className="doc-preview-paper overflow-hidden rounded-lg shadow-[0_24px_80px_rgb(0_0_0/0.55)]"
      >
        <RenderDocument slug={slug} context={context} />
      </div>
    </DocumentPreviewFrame>
  );
}
