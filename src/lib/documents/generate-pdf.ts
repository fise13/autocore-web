import "server-only";

import { DocumentTheme } from "@/domain/company-branding";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import {
  applyPdfExportLayoutScript,
  computePdfFitScale,
  measurePdfPageScript,
  PDF_A4_HEIGHT_PX,
  PDF_A4_WIDTH_PX,
  PDF_PAGE_ROOT_SELECTORS,
  PDF_SERVICE_TAG_HEIGHT_PX,
  PDF_SERVICE_TAG_WIDTH_PX,
} from "@/lib/documents/fit-pdf-page";
import { getPuppeteerBrowser } from "@/lib/documents/puppeteer-browser";
import { documentRenderUrl } from "@/lib/documents/render-token";

export type PdfFromUrlOptions = {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  theme?: DocumentTheme;
};

async function waitForPdfAssets(page: Awaited<ReturnType<Awaited<ReturnType<typeof getPuppeteerBrowser>>["newPage"]>>) {
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page
    .waitForFunction(
      () => {
        const images = [...document.images];
        return images.length === 0 || images.every((img) => img.complete);
      },
      { timeout: 12_000 },
    )
    .catch(() => undefined);
}

export async function generatePdfFromRenderUrl(params: PdfFromUrlOptions): Promise<Buffer> {
  const definition = DOCUMENT_BY_SLUG[params.slug];
  const isServiceTag = definition.pageSize === "service-tag";
  const targetWidthPx = isServiceTag ? PDF_SERVICE_TAG_WIDTH_PX : PDF_A4_WIDTH_PX;
  const targetHeightPx = isServiceTag ? PDF_SERVICE_TAG_HEIGHT_PX : PDF_A4_HEIGHT_PX;
  const url = documentRenderUrl({ ...params, export: true });

  const browser = await getPuppeteerBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: targetWidthPx, height: targetHeightPx, deviceScaleFactor: 1 });

    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
    if (!response || !response.ok()) {
      const status = response?.status() ?? "no response";
      throw new Error(`Страница рендера PDF недоступна (${status}): ${url}`);
    }

    await page.waitForSelector(".doc-pdf-page, .doc-racing-page, .doc-sr-page, .doc-page", {
      timeout: 20_000,
    });
    await waitForPdfAssets(page);
    await page.emulateMediaType("print");

    const pageSelectors = [...PDF_PAGE_ROOT_SELECTORS];
    const measureArgs = { targetWidthPx, pageSelectors };

    let content = await page.evaluate(measurePdfPageScript, measureArgs);
    let fitScale = computePdfFitScale(content.contentHeight, targetHeightPx);

    if (fitScale < 0.999) {
      await page.setViewport({
        width: targetWidthPx,
        height: Math.min(Math.ceil(content.contentHeight + 48), 10_000),
        deviceScaleFactor: 1,
      });
      content = await page.evaluate(measurePdfPageScript, measureArgs);
      fitScale = computePdfFitScale(content.contentHeight, targetHeightPx);
    }

    await page.setViewport({ width: targetWidthPx, height: targetHeightPx, deviceScaleFactor: 1 });
    await page.evaluate(applyPdfExportLayoutScript, {
      fitScale,
      targetWidthPx,
      targetHeightPx,
      pageSelectors,
    });

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      pageRanges: "1",
      ...(isServiceTag
        ? { width: "70mm", height: "100mm", margin: { top: "0", right: "0", bottom: "0", left: "0" } }
        : {
            width: `${targetWidthPx}px`,
            height: `${targetHeightPx}px`,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
  options?: { theme?: DocumentTheme; aggregateType?: "work_order" | "warranty" | "quote" },
): Promise<Buffer> {
  return generatePdfFromRenderUrl({
    slug,
    companyId,
    orderId,
    theme: options?.theme,
    aggregateType: options?.aggregateType,
  });
}
