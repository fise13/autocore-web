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

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
): Promise<void> {
  const resolvedFilename = filename ?? `${slug}-${aggregateId}.pdf`;
  const cachedUrl = options?.cachedDownloadUrl?.trim();
  if (cachedUrl) {
    try {
      await downloadDocumentPdfFromUrl(cachedUrl, resolvedFilename);
      return;
    } catch {
      // Fall back to on-demand generation.
    }
  }

  const blob = await fetchDocumentPdf(slug, aggregateId, options);
  downloadPdfBlob(blob, resolvedFilename);
}

export async function printDocumentPdf(
  slug: DocumentSlug,
  aggregateId: string,
  options?: { aggregateType?: DocumentAggregateType },
): Promise<void> {
  const blob = await fetchDocumentPdf(slug, aggregateId, { inline: true, ...options });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      resolve();
    };

    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup) {
      const triggerPrint = () => {
        try {
          popup.focus();
          popup.print();
        } catch {
          // Browser may block programmatic print — user can print from the tab.
        }
        finish();
      };

      popup.addEventListener("load", triggerPrint);
      window.setTimeout(triggerPrint, 450);
      return;
    }

    const frame = document.createElement("iframe");
    frame.setAttribute("title", "Печать PDF");
    frame.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:99999;background:#0a0a0a;";
    frame.src = url;

    const cleanup = () => {
      frame.remove();
      finish();
    };

    const triggerFramePrint = () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        cleanup();
        reject(new Error("Браузер не открыл PDF для печати"));
        return;
      }

      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        reject(
          new Error("Браузер заблокировал печать. Разрешите всплывающие окна или скачайте PDF."),
        );
        frame.remove();
        URL.revokeObjectURL(url);
        return;
      }

      printWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 120_000);
    };

    frame.onload = triggerFramePrint;
    frame.onerror = () => {
      frame.remove();
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось загрузить PDF для печати"));
    };

    document.body.appendChild(frame);
    window.setTimeout(triggerFramePrint, 450);
  });
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
