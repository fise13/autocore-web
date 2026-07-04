import type { DocumentSlug } from "@/lib/documents/document-types";

/** Live document preview for a work order / quote / warranty aggregate. */
export function documentPreviewPath(orderId: string, slug: DocumentSlug | string): string {
  return `/documents/${orderId}/${slug}`;
}

/** Template gallery preview (demo data). */
export function documentTemplatePreviewPath(slug: DocumentSlug | string): string {
  return `/documents/preview/${slug}`;
}

/** Open document preview as a dedicated view in a new browser tab. */
export function openDocumentPreviewInNewTab(path: string): void {
  if (typeof window === "undefined") return;
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
