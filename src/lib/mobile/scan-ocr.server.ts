import "server-only";

import { buildScanCodeVariants } from "./scan-normalize";
import { resolveMobileScan, type MobileScanResolveResult } from "./scan-resolve.server";
import { runScanOcr } from "./scan-ai-client.server";

export type ScanOcrResolveResult = {
  ocr: Awaited<ReturnType<typeof runScanOcr>>;
  resolve: MobileScanResolveResult | null;
  extractedCodes: string[];
};

export async function ocrAndResolveMobileScan(
  companyId: string,
  imageBase64: string,
  mimeType: string,
): Promise<ScanOcrResolveResult> {
  const ocr = await runScanOcr(imageBase64, mimeType);
  const extractedCodes = [...new Set([...ocr.barcodes, ...ocr.partNumbers].map((code) => code.trim()).filter(Boolean))];

  let resolve: MobileScanResolveResult | null = null;
  for (const code of extractedCodes) {
    const variants = buildScanCodeVariants(code);
    for (const variant of variants) {
      const attempt = await resolveMobileScan(companyId, variant);
      if (attempt.found) {
        resolve = attempt;
        break;
      }
      if (!resolve || attempt.confidence > resolve.confidence) {
        resolve = attempt;
      }
    }
    if (resolve?.found) break;
  }

  return { ocr, resolve, extractedCodes };
}
