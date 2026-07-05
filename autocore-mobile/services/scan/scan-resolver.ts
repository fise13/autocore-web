import type { MobileScanResolveResult, ScanOcrResolveResponse } from '@/types/inventory';

import type { ScanOutcome, ScanResolveRequest, ScanSource } from './types';
import { mapApiResolve, mapOcrResponse, resolveBarcodePayload } from './handlers/resolve-handler';

export type ScanServiceDeps = {
  resolveInventory: (barcode: string, source: ScanSource) => Promise<MobileScanResolveResult>;
  disambiguate: (barcode: string) => Promise<MobileScanResolveResult>;
  resolveOcr: (uri: string) => Promise<ScanOcrResolveResponse>;
  feedbackPick: (input: {
    barcode: string;
    itemId: string;
    score: number;
  }) => Promise<MobileScanResolveResult | null>;
  canInventoryView: () => boolean;
  allowMock: () => boolean;
};

export async function resolveScanPayload(
  deps: ScanServiceDeps,
  request: ScanResolveRequest,
): Promise<ScanOutcome> {
  return resolveBarcodePayload(
    {
      ...request,
      canInventoryView: request.canInventoryView ?? deps.canInventoryView(),
      allowMock: request.allowMock ?? deps.allowMock(),
    },
    (barcode, source) => deps.resolveInventory(barcode, source),
  );
}

export async function disambiguateScanPayload(
  deps: ScanServiceDeps,
  barcode: string,
): Promise<ScanOutcome> {
  const result = await deps.disambiguate(barcode);
  return mapApiResolve(barcode, result);
}

export async function pickScanCandidate(
  deps: ScanServiceDeps,
  input: { barcode: string; itemId: string; score: number },
): Promise<ScanOutcome | null> {
  const result = await deps.feedbackPick(input);
  if (!result) return null;
  return mapApiResolve(input.barcode, result);
}

export async function resolveScanPhoto(
  deps: ScanServiceDeps,
  uri: string,
  preferDocument: boolean,
  request: Omit<ScanResolveRequest, 'payload' | 'source'>,
): Promise<ScanOutcome | 'retry'> {
  const ocrResult = await deps.resolveOcr(uri);
  const mapped = mapOcrResponse(ocrResult, preferDocument);
  if (mapped === 'retry') return 'retry';
  if (mapped.kind === 'not-found' || mapped.kind === 'product' || mapped.kind === 'candidates') {
    return mapped;
  }
  if (mapped.kind === 'navigate-entity' || mapped.kind === 'navigate-vin' || mapped.kind === 'foreign-url') {
    return mapped;
  }
  if (mapped.kind === 'document') return mapped;

  if (ocrResult.resolve) {
    return mapApiResolve(ocrResult.extractedCodes[0] ?? uri, ocrResult.resolve, 'ocr');
  }

  return resolveScanPayload(deps, {
    ...request,
    payload: ocrResult.extractedCodes[0] ?? '',
    source: 'ocr',
  });
}
