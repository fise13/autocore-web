import { waitForFirebaseUser } from "@/lib/auth/wait-for-firebase-user";
import { mapDocumentError } from "@/lib/documents/map-document-error";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentAggregateType } from "@/lib/documents/resolve-document-context";

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
  if (options?.inline) params.set("inline", "1");
  if (options?.aggregateType && options.aggregateType !== "work_order") {
    params.set("aggregate", options.aggregateType);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return `/api/pdf/${slug}/${aggregateId}${query}`;
}

async function readPdfError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return payload?.error ?? "Не удалось получить PDF";
  }
  const text = await response.text().catch(() => "");
  return text.trim() || "Не удалось получить PDF";
}

export async function fetchDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { inline?: boolean; aggregateType?: DocumentAggregateType },
): Promise<Blob> {
  const token = await getAuthToken();
  const response = await fetch(buildPdfUrl(slug, aggregateId, options), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(mapDocumentError(new Error(await readPdfError(response))));
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Сервер вернул пустой PDF");
  }

  return blob;
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
  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Не удалось скачать сохранённый PDF");
  }
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Сервер вернул пустой PDF");
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
  const cachedUrl = options?.cachedDownloadUrl?.trim();
  if (cachedUrl) {
    try {
      await downloadDocumentPdfFromUrl(cachedUrl, resolvedFilename);
      return "downloaded";
    } catch {
      // Fall back to on-demand generation.
    }
  }

  const blob = await fetchDocumentPdf(slug, aggregateId, options);
  return deliverPdfToUser(blob, resolvedFilename);
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
      reject(new Error("PDF не успел загрузиться для печати"));
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

  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("title", "Печать PDF");
    frame.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    frame.src = url;
    document.body.appendChild(frame);

    try {
      await waitForPdfFrame(frame);
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        throw new Error("Браузер не открыл PDF для печати");
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
    throw new Error(mapDocumentError(new Error(payload?.error ?? "Не удалось сгенерировать документы")));
  }
}
