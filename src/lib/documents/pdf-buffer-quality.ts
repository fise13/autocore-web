/** Blank Puppeteer A4 pages are typically a few KB; real docs with fonts are much larger. */
export const MIN_MEANINGFUL_PDF_BYTES = 6_000;

export function isLikelyBlankPdf(buffer: Buffer): boolean {
  if (buffer.length < MIN_MEANINGFUL_PDF_BYTES) return true;
  const sample = buffer.toString("latin1");
  const streamCount = (sample.match(/stream\r?\n/g) ?? []).length;
  return streamCount < 2 && buffer.length < 12_000;
}
