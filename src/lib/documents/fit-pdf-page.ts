/** A4 page size at 96 CSS DPI (matches Puppeteer viewport 794×1123). */
export const PDF_A4_WIDTH_PX = 794;
export const PDF_A4_HEIGHT_PX = 1123;

/** Service tag 70×100 mm at 96 DPI. */
export const PDF_SERVICE_TAG_WIDTH_PX = 264;
export const PDF_SERVICE_TAG_HEIGHT_PX = 378;

export const PDF_PAGE_ROOT_SELECTORS = [
  ".doc-pdf-page",
  ".doc-racing-page",
  ".doc-sr-page",
  ".doc-page",
] as const;

export type MeasurePdfPageOptions = {
  targetWidthPx: number;
  pageSelectors: readonly string[];
};

export type MeasurePdfPageResult = {
  contentHeight: number;
};

export type ApplyPdfExportLayoutOptions = {
  fitScale: number;
  contentHeight: number;
  targetWidthPx: number;
  targetHeightPx: number;
  pageSelectors: readonly string[];
};

export function computePdfFitScale(contentHeight: number, targetHeightPx: number): number {
  if (contentHeight <= 0) return 1;
  const scale = Math.min(1, targetHeightPx / contentHeight);
  return Math.round(scale * 1000) / 1000;
}

/** Self-contained for page.evaluate() — measures natural content height in print layout. */
export function measurePdfPageScript(options: MeasurePdfPageOptions): MeasurePdfPageResult {
  const { targetWidthPx, pageSelectors } = options;

  let pageEl: HTMLElement | null = null;
  for (const selector of pageSelectors) {
    pageEl = document.querySelector<HTMLElement>(selector);
    if (pageEl) break;
  }

  if (!pageEl) {
    return { contentHeight: 0 };
  }

  pageEl.style.setProperty("width", `${targetWidthPx}px`, "important");
  pageEl.style.setProperty("max-width", `${targetWidthPx}px`, "important");
  pageEl.style.setProperty("margin", "0", "important");
  pageEl.style.setProperty("min-height", "0", "important");
  pageEl.style.setProperty("height", "auto", "important");
  pageEl.style.setProperty("max-height", "none", "important");
  pageEl.style.setProperty("transform", "none", "important");

  return {
    contentHeight: Math.max(Math.ceil(pageEl.scrollHeight), 1),
  };
}

/**
 * Self-contained for page.evaluate().
 * Fits content to one sheet via CSS zoom (affects layout box in Chromium — unlike transform).
 */
export function applyPdfExportLayoutScript(options: ApplyPdfExportLayoutOptions): void {
  const { fitScale, contentHeight, targetWidthPx, targetHeightPx, pageSelectors } = options;
  const needsScale = fitScale < 0.999;

  const resetShell = (el: HTMLElement) => {
    el.style.setProperty("margin", "0", "important");
    el.style.setProperty("padding", "0", "important");
    el.style.setProperty("background", "#ffffff", "important");
    el.style.setProperty("min-height", "0", "important");
    el.style.setProperty("height", "auto", "important");
    el.style.setProperty("overflow", "visible", "important");
  };

  const html = document.documentElement;
  const body = document.body;

  resetShell(html);
  resetShell(body);
  body.style.setProperty("display", "block", "important");
  html.style.setProperty("width", `${targetWidthPx}px`, "important");

  for (const selector of [".documents-render-shell", ".documents-root"]) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) resetShell(node);
  }

  let pageEl: HTMLElement | null = null;
  for (const selector of pageSelectors) {
    pageEl = document.querySelector<HTMLElement>(selector);
    if (pageEl) break;
  }
  if (!pageEl) return;

  pageEl.style.setProperty("margin", "0", "important");
  pageEl.style.setProperty("box-shadow", "none", "important");
  pageEl.style.setProperty("box-sizing", "border-box", "important");
  pageEl.style.setProperty("position", "relative", "important");
  pageEl.style.setProperty("overflow", "hidden", "important");
  pageEl.style.setProperty("print-color-adjust", "exact", "important");
  pageEl.style.setProperty("-webkit-print-color-adjust", "exact", "important");
  pageEl.style.setProperty("transform", "none", "important");
  pageEl.style.setProperty("width", `${targetWidthPx}px`, "important");
  pageEl.style.setProperty("max-width", `${targetWidthPx}px`, "important");
  pageEl.style.setProperty("min-width", `${targetWidthPx}px`, "important");
  pageEl.style.setProperty("min-height", "0", "important");
  pageEl.style.setProperty("height", "auto", "important");

  if (needsScale) {
    pageEl.style.setProperty("zoom", String(fitScale), "important");
    const fittedHeight = Math.min(Math.ceil(contentHeight * fitScale), targetHeightPx);
    pageEl.style.setProperty("max-height", `${fittedHeight}px`, "important");
  } else {
    pageEl.style.setProperty("zoom", "1", "important");
    pageEl.style.setProperty("max-height", `${targetHeightPx}px`, "important");
  }
}
