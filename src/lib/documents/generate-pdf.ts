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
import { isLikelyBlankPdf } from "@/lib/documents/pdf-buffer-quality";
import { getPuppeteerBrowser } from "@/lib/documents/puppeteer-browser";
import { documentRenderUrl } from "@/lib/documents/render-token";

export type PdfFromUrlOptions = {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  theme?: DocumentTheme;
  locale?: "en" | "ru";
};

type PdfPage = Awaited<ReturnType<Awaited<ReturnType<typeof getPuppeteerBrowser>>["newPage"]>>;

const PDF_PAGE_SELECTOR = ".doc-pdf-page, .doc-racing-page, .doc-sr-page, .doc-page";

export { isLikelyBlankPdf, MIN_MEANINGFUL_PDF_BYTES } from "@/lib/documents/pdf-buffer-quality";

async function waitForPdfAssets(page: PdfPage) {
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

async function waitForPdfTextContent(page: PdfPage): Promise<void> {
  await page.waitForFunction(
    (selector) => {
      const root = document.querySelector(selector);
      const text = root?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return text.length > 40;
    },
    { timeout: 25_000 },
    PDF_PAGE_SELECTOR,
  );
}

async function assertPdfRenderContent(page: PdfPage): Promise<void> {
  const snapshot = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    const text = root?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return {
      hasRoot: Boolean(root),
      textLength: text.length,
      preview: text.slice(0, 120),
    };
  }, PDF_PAGE_SELECTOR);

  if (!snapshot.hasRoot || snapshot.textLength < 40) {
    throw new Error(
      `Документ не содержит данных для PDF (${snapshot.textLength} символов). Проверьте контекст гарантии или счёта.`,
    );
  }
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

    // networkidle2 — wait for RSC/streaming to finish; domcontentloaded alone often yields blank PDFs.
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
    if (!response || !response.ok()) {
      const status = response?.status() ?? "no response";
      throw new Error(`Страница рендера PDF недоступна (${status}): ${url}`);
    }

    await page.waitForSelector(PDF_PAGE_SELECTOR, { timeout: 20_000 });
    await waitForPdfTextContent(page);
    await waitForPdfAssets(page);
    await assertPdfRenderContent(page);
    await page.emulateMediaType("print");

    const pageSelectors = [...PDF_PAGE_ROOT_SELECTORS];
    const measureArgs = { targetWidthPx, pageSelectors };

    await page.setViewport({
      width: targetWidthPx,
      height: Math.min(10_000, targetHeightPx * 4),
      deviceScaleFactor: 1,
    });

    let content = await page.evaluate(measurePdfPageScript, measureArgs);
    let fitScale = computePdfFitScale(content.contentHeight, targetHeightPx);
    // Never shrink so hard that text becomes invisible on the sheet.
    fitScale = Math.max(fitScale, isServiceTag ? 0.55 : 0.5);

    await page.evaluate(applyPdfExportLayoutScript, {
      targetWidthPx,
      pageSelectors,
    });

    content = await page.evaluate(measurePdfPageScript, measureArgs);
    fitScale = Math.max(computePdfFitScale(content.contentHeight, targetHeightPx), isServiceTag ? 0.55 : 0.5);

    const captureHeightPx = Math.max(
      targetHeightPx,
      Math.min(Math.ceil(content.contentHeight), 10_000),
    );
    await page.setViewport({
      width: targetWidthPx,
      height: captureHeightPx,
      deviceScaleFactor: 1,
    });

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      pageRanges: "1",
      ...(isServiceTag
        ? {
            width: "70mm",
            height: "100mm",
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            scale: fitScale,
          }
        : {
            width: `${targetWidthPx}px`,
            height: `${targetHeightPx}px`,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            scale: fitScale,
          }),
    });

    const buffer = Buffer.from(pdf);
    if (isLikelyBlankPdf(buffer)) {
      throw new Error(
        `PDF получился пустым (${buffer.length} байт). Повторите генерацию или проверьте страницу рендера.`,
      );
    }

    return buffer;
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function generateDocumentPdf(
  slug: DocumentSlug,
  companyId: string,
  orderId: string,
  options?: {
    theme?: DocumentTheme;
    aggregateType?: "work_order" | "warranty" | "quote";
    locale?: "en" | "ru";
  },
): Promise<Buffer> {
  return generatePdfFromRenderUrl({
    slug,
    companyId,
    orderId,
    theme: options?.theme,
    aggregateType: options?.aggregateType,
    locale: options?.locale,
  });
}
