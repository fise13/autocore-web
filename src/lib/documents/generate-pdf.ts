import "server-only";

import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import { getPuppeteerBrowser } from "@/lib/documents/puppeteer-browser";
import { documentRenderUrl } from "@/lib/documents/render-token";

export type PdfFromUrlOptions = {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  theme?: string;
};

export async function generatePdfFromRenderUrl(params: PdfFromUrlOptions): Promise<Buffer> {
  const definition = DOCUMENT_BY_SLUG[params.slug];
  const isServiceTag = definition.pageSize === "service-tag";
  const url = documentRenderUrl(params);

  const browser = await getPuppeteerBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport(
      isServiceTag ? { width: 264, height: 378 } : { width: 794, height: 1123 },
    );

    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!response || !response.ok()) {
      const status = response?.status() ?? "no response";
      throw new Error(`Страница рендера PDF недоступна (${status}): ${url}`);
    }

    await page.waitForSelector(".doc-pdf-page, .doc-racing-page, .doc-sr-page, .doc-page", {
      timeout: 20_000,
    });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      ...(isServiceTag
        ? { width: "70mm", height: "100mm", margin: { top: "0", right: "0", bottom: "0", left: "0" } }
        : {
            format: "A4",
            margin:
              params.slug === "work-order"
                ? { top: "0", right: "0", bottom: "0", left: "0" }
                : { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
          }),
    });

    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function generateDocumentPdf(
  slug: DocumentSlug,
  companyId: string,
  orderId: string,
  options?: { theme?: string; aggregateType?: "work_order" | "warranty" | "quote" },
): Promise<Buffer> {
  return generatePdfFromRenderUrl({
    slug,
    companyId,
    orderId,
    theme: options?.theme,
    aggregateType: options?.aggregateType,
  });
}
