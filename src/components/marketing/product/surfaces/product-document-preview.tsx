"use client";

import { useRef, useState } from "react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useMarketingDocumentContext } from "@/components/marketing/modals/use-marketing-document-context";
import {
  DocumentScaledPreviewFrame,
  useDocumentPreviewScale,
} from "@/components/documents/document-scaled-preview";
import { RenderDocument } from "@/components/documents/registry/render-document";
import { DOCUMENT_DEFINITIONS, type DocumentSlug } from "@/lib/documents/document-types";
import { cn } from "@/lib/utils";

const PREVIEW_SLUGS: DocumentSlug[] = ["work-order", "engine-warranty", "service-act"];

const TABS = DOCUMENT_DEFINITIONS.filter((definition) => PREVIEW_SLUGS.includes(definition.slug));

/** Real AutoCore document templates via RenderDocument. */
export function ProductDocumentPreview({ className }: { className?: string }) {
  const chrome = useDemoChrome();
  const { landingSaleDocumentContext } = useMarketingDocumentContext();
  const [slug, setSlug] = useState<DocumentSlug>("work-order");
  const viewportRef = useRef<HTMLDivElement>(null);
  const scale = useDocumentPreviewScale(viewportRef, 1, true, "contain");

  return (
    <div className={cn("product-doc-preview", className)}>
      <div className="product-doc-tabs" role="tablist" aria-label={chrome.documents.typeAria}>
        {TABS.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            role="tab"
            aria-selected={slug === tab.slug}
            className={cn("product-doc-tab", slug === tab.slug && "is-active")}
            onClick={() => setSlug(tab.slug)}
          >
            {chrome.documents.titles[tab.slug]}
          </button>
        ))}
      </div>

      <div ref={viewportRef} className="product-doc-viewport">
        <DocumentScaledPreviewFrame scale={scale}>
          <div className="exp-sale-document-paper">
            <RenderDocument slug={slug} context={landingSaleDocumentContext} />
          </div>
        </DocumentScaledPreviewFrame>
      </div>
    </div>
  );
}
