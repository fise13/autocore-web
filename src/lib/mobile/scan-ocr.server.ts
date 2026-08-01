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

  // One OCR pass can yield several codes, each expanding into a few variants.
  // Resolving those one at a time meant a dozen sequential Firestore round
  // trips after an already slow AI call; a code's variants are independent, so
  // they go out together and the first hit wins.
  let resolve: MobileScanResolveResult | null = null;
  for (const code of extractedCodes) {
    const attempts = await Promise.all(
      buildScanCodeVariants(code).map((variant) => resolveMobileScan(companyId, variant)),
    );

    const hit = attempts.find((attempt) => attempt.found);
    if (hit) {
      resolve = hit;
      break;
    }

    for (const attempt of attempts) {
      if (!resolve || attempt.confidence > resolve.confidence) {
        resolve = attempt;
      }
    }
  }

  return { ocr, resolve, extractedCodes };
}
