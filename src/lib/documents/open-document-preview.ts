import type { DocumentSlug } from "@/lib/documents/document-types";
import { openAppUrl } from "@/platform";

/** Live document preview for a work order / quote / warranty aggregate. */
export function documentPreviewPath(orderId: string, slug: DocumentSlug | string): string {
  return `/documents/${orderId}/${slug}`;
}

/** Template gallery preview (demo data). */
export function documentTemplatePreviewPath(slug: DocumentSlug | string): string {
  return `/documents/preview/${slug}`;
}

/**
 * Open a document preview as a dedicated view — a new browser tab on web, a
 * second app window in the desktop shell.
 *
 * The shell used to deny every new window, so this silently did nothing in the
 * desktop app; `openAppUrl` now goes through the platform adapter, and
 * `src-tauri/src/window.rs` turns product URLs into real windows.
 */
export function openDocumentPreviewInNewTab(path: string): void {
  if (typeof window === "undefined") return;
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  openAppUrl(url);
}
