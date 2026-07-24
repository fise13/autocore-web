import { waitForFirebaseUser } from "@/lib/auth/wait-for-firebase-user";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentAggregateType } from "@/lib/documents/resolve-document-context";
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

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const pdfBlob = toPdfBlob(blob);
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type PdfDeliveryResult = "downloaded";

export function deliverPdfToUser(blob: Blob, filename: string): PdfDeliveryResult {
  downloadPdfBlob(blob, filename);
  return "downloaded";
}

export async function downloadDocumentPdfFromUrl(downloadUrl: string, filename: string): Promise<void> {
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
  downloadPdfBlob(blob, filename);
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
    return deliverPdfToUser(blob, resolvedFilename);
  } catch (apiError) {
    const cachedUrl = options?.cachedDownloadUrl?.trim();
    if (cachedUrl) {
      try {
        await downloadDocumentPdfFromUrl(cachedUrl, resolvedFilename);
        return "downloaded";
      } catch {
        // keep api error
      }
    }
    throw apiError instanceof Error ? apiError : new Error(mapDocumentError(apiError));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForPdfFrame(frame: HTMLIFrameElement, timeoutMs = 15_000): Promise<void> {
  if (frame.contentDocument?.readyState === "complete") {
    await sleep(900);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(userCopy.documents.errors.printLoadTimeout));
    }, timeoutMs);

    const onLoad = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      frame.removeEventListener("load", onLoad);
    };

    frame.addEventListener("load", onLoad, { once: true });
  });

  await sleep(900);
}

export async function printPdfBlob(blob: Blob): Promise<void> {
  const pdfBlob = toPdfBlob(blob);
  const url = URL.createObjectURL(pdfBlob);
  const errors = userCopy.documents.errors;

  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("title", errors.printTitle);
    frame.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    frame.src = url;
    document.body.appendChild(frame);

    try {
      await waitForPdfFrame(frame);
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        throw new Error(errors.printWindowFailed);
      }

      printWindow.focus();
      printWindow.print();
    } finally {
      window.setTimeout(() => frame.remove(), 120_000);
    }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }
}

export async function printDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<void> {
  const blob = await fetchDocumentPdf(slug, aggregateId, { inline: true, ...options });
  await printPdfBlob(blob);
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
