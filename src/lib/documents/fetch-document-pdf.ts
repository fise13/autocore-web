import { waitForFirebaseUser } from "@/lib/auth/wait-for-firebase-user";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentAggregateType } from "@/lib/documents/resolve-document-context";
import { printPdfBlob as platformPrintPdfBlob, saveFile } from "@/platform";
import type { SaveFileResult } from "@/platform";
import { userCopy } from "@/lib/user-copy";

async function getAuthToken(): Promise<string> {
  const user = await waitForFirebaseUser();
  return user.getIdToken();
}

function buildPdfUrl(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { inline?: boolean; aggregateType?: DocumentAggregateType },
): string {
  const params = new URLSearchParams();
  // Always ask for bytes — browser fetch following 302 to Firebase Storage fails CORS ("Load failed").
  params.set("redirect", "0");
  if (options?.inline) params.set("inline", "1");
  if (options?.aggregateType && options.aggregateType !== "work_order") {
    params.set("aggregate", options.aggregateType);
  }
  return `/api/pdf/${slug}/${aggregateId}?${params.toString()}`;
}

async function readPdfError(response: Response): Promise<string> {
  const errors = userCopy.documents.errors;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      status?: string;
    } | null;
    if (payload?.status === "generating") {
      return payload.message ?? errors.generating;
    }
    return payload?.error ?? payload?.message ?? errors.fetchFailed;
  }
  const text = await response.text().catch(() => "");
  return text.trim() || errors.fetchFailed;
}

export async function fetchDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { inline?: boolean; aggregateType?: DocumentAggregateType },
): Promise<Blob> {
  const emptyServerPdf = userCopy.documents.errors.emptyServerPdf;
  try {
    const token = await getAuthToken();
    const response = await fetch(buildPdfUrl(slug, aggregateId, options), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(mapDocumentError(new Error(await readPdfError(response))));
    }

    if (response.status === 202) {
      throw new Error(mapDocumentError(new Error(await readPdfError(response))));
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error(emptyServerPdf);
    }

    return blob;
  } catch (error) {
    if (error instanceof Error && error.message !== emptyServerPdf) {
      throw new Error(mapDocumentError(error));
    }
    throw error;
  }
}

function toPdfBlob(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

const PDF_FILTERS = [{ name: "PDF", extensions: ["pdf"] }];

/**
 * Where the PDF ended up. `"downloaded"` is the browser path, `"saved"` carries
 * the desktop path the user chose, and `"cancelled"` means they dismissed the
 * save dialog — a normal outcome callers must not report as a failure.
 */
export type PdfDeliveryResult = SaveFileResult;

/**
 * Hand a PDF to the user through whichever mechanism the platform has: the
 * browser's download manager on web, a native save dialog in the desktop shell.
 */
export async function downloadPdfBlob(blob: Blob, filename: string): Promise<PdfDeliveryResult> {
  return saveFile({
    filename,
    blob: toPdfBlob(blob),
    filters: PDF_FILTERS,
  });
}

export async function deliverPdfToUser(blob: Blob, filename: string): Promise<PdfDeliveryResult> {
  return downloadPdfBlob(blob, filename);
}

export async function downloadDocumentPdfFromUrl(
  downloadUrl: string,
  filename: string,
): Promise<PdfDeliveryResult> {
  const errors = userCopy.documents.errors;
  const trimmed = downloadUrl.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    throw new Error(errors.invalidUrl);
  }

  const response = await fetch(trimmed, { cache: "no-store", mode: "cors" });
  if (!response.ok) {
    throw new Error(errors.downloadCachedFailed);
  }
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error(errors.emptyServerPdf);
  }
  return downloadPdfBlob(blob, filename);
}

export async function downloadDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  filename?: string,
  options?: { aggregateType?: DocumentAggregateType; cachedDownloadUrl?: string },
): Promise<PdfDeliveryResult> {
  const resolvedFilename = filename ?? `${slug}-${aggregateId}.pdf`;
  // Prefer authenticated API (redirect=0) — avoids CORS "Load failed" on Firebase Storage from localhost.
  try {
    const blob = await fetchDocumentPdf(slug, aggregateId, options);
    return await deliverPdfToUser(blob, resolvedFilename);
  } catch (apiError) {
    const cachedUrl = options?.cachedDownloadUrl?.trim();
    if (cachedUrl) {
      try {
        return await downloadDocumentPdfFromUrl(cachedUrl, resolvedFilename);
      } catch {
        // keep api error
      }
    }
    throw apiError instanceof Error ? apiError : new Error(mapDocumentError(apiError));
  }
}

/**
 * Print a PDF. The hidden-iframe implementation this used to hold now lives in
 * `src/platform/print.ts`, alongside the desktop path — WKWebView ignores
 * `window.print()`, so the shell needs the OS print pipeline instead.
 */
export async function printPdfBlob(blob: Blob, filename = "autocore-document.pdf"): Promise<void> {
  await platformPrintPdfBlob(toPdfBlob(blob), filename);
}

export async function printDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<void> {
  const blob = await fetchDocumentPdf(slug, aggregateId, { inline: true, ...options });
  await printPdfBlob(blob, `${slug}-${aggregateId}.pdf`);
}

export async function generateWorkOrderDocuments(orderId: string, types?: DocumentSlug[]): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch("/api/documents/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, types }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      mapDocumentError(new Error(payload?.error ?? userCopy.documents.errors.generateDocsFailed)),
    );
  }
}
