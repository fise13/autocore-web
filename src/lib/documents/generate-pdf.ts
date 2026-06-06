import "server-only";

import puppeteer from "puppeteer-core";

import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import { documentRenderUrl } from "@/lib/documents/render-token";
import {
  resolvePuppeteerExecutablePath,
  resolvePuppeteerLaunchArgs,
  shouldUseLambdaChromium,
} from "@/lib/documents/resolve-puppeteer-executable";

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

  const executablePath = await resolvePuppeteerExecutablePath();
  const args = await resolvePuppeteerLaunchArgs(shouldUseLambdaChromium(executablePath));

  const browser = await puppeteer.launch({
    args,
    defaultViewport: isServiceTag ? { width: 264, height: 378 } : { width: 794, height: 1123 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
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
    await browser.close();
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
