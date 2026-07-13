import { resolveScanPayload } from '@/features/scan/data/mock-scan-registry';
import { classifyScanPayload } from '@/features/scan/lib/classify-payload';
import { parseDocumentText } from '@/features/scan/lib/parse-document';
import { findVinInCodes, findVinInText } from '@/features/scan/lib/vin';
import { mapResolveResultToScanResult } from '@/lib/scan/map-resolve-result';
import { normalizeScanPayload } from '@/lib/scan/normalize-scan-payload';
import type { MobileScanResolveResult, ScanOcrResolveResponse } from '@/types/inventory';

import type { ScanOutcome, ScanResolveRequest } from '../types';

export function classifyPayloadOutcome(payload: string): ScanOutcome | 'barcode' {
  const classified = classifyScanPayload(payload);

  if (classified.type === 'entity-link') {
    return {
      kind: 'navigate-entity',
      entity: classified.entity,
      id: classified.id,
      payload,
    };
  }

  if (classified.type === 'vin') {
    return { kind: 'navigate-vin', vin: classified.vin, payload };
  }

  if (classified.type === 'url') {
    return { kind: 'foreign-url', url: classified.url };
  }

  return 'barcode';
}

function isWeakCameraAutoAccept(matchType: MobileScanResolveResult['matchType']): boolean {
  return matchType === 'ai';
}

export function mapApiResolve(
  payload: string,
  apiResult: MobileScanResolveResult | null,
  source?: ScanResolveRequest['source'],
): ScanOutcome {
  if (apiResult) {
    const strictCamera = source === 'camera';
    const rejectAutoAccept = strictCamera && isWeakCameraAutoAccept(apiResult.matchType);

    if (apiResult.found && apiResult.item && !rejectAutoAccept) {
      const mapped = mapResolveResultToScanResult(apiResult);
      if (mapped) {
        return { kind: 'product', result: mapped, payload };
      }
    }

    if (apiResult.candidates.length > 0) {
      return {
        kind: 'candidates',
        payload,
        result: {
          id: 'candidates',
          kind: 'part',
          code: apiResult.barcode,
          title: 'Несколько совпадений',
          subtitle: payload,
          candidates: apiResult.candidates.map((candidate) => ({
            id: candidate.item.id,
            sku: candidate.item.sku,
            name: candidate.item.name,
            score: candidate.score,
            reason: candidate.reason,
            sellPrice: candidate.item.sellPrice,
            totalAvailable: candidate.item.totalAvailable,
            brandName: candidate.item.brandName,
            warehouseLocation: candidate.item.warehouseLocation,
          })),
          aiReasoning: apiResult.aiReasoning,
          confidence: apiResult.confidence,
          matchType: apiResult.matchType,
        },
      };
    }
  }

  return { kind: 'not-found', payload };
}

export async function resolveBarcodePayload(
  request: ScanResolveRequest,
  apiResolve: (barcode: string, source: ScanResolveRequest['source']) => Promise<MobileScanResolveResult>,
): Promise<ScanOutcome> {
  const raw = request.payload.trim();
  const payload = normalizeScanPayload(raw) || raw;
  if (!payload) {
    return { kind: 'not-found', payload: request.payload };
  }

  const classified = classifyPayloadOutcome(payload);
  if (classified !== 'barcode') return classified;

  if (request.cachedResult) {
    return mapApiResolve(payload, request.cachedResult, request.source);
  }

  if (request.canInventoryView) {
    try {
      const result = await apiResolve(raw, request.source);
      return mapApiResolve(payload, result, request.source);
    } catch {
      if (request.allowMock) {
        const mock = resolveScanPayload(payload);
        if (mock) return { kind: 'product', result: mock, payload };
      }
      return { kind: 'not-found', payload };
    }
  }

  if (request.allowMock) {
    const mock = resolveScanPayload(payload);
    if (mock) return { kind: 'product', result: mock, payload };
  }

  return { kind: 'not-found', payload };
}

export function mapOcrResponse(
  ocrResult: ScanOcrResolveResponse,
  preferDocument: boolean,
): ScanOutcome | 'retry' {
  const codes = ocrResult.extractedCodes.map(normalizeScanPayload).filter(Boolean);
  const rawText = ocrResult.ocr.rawText?.trim() ?? '';
  const vin = findVinInCodes(codes) ?? (rawText ? findVinInText(rawText) : null);

  if (preferDocument || rawText.length >= 40) {
    const doc = parseDocumentText(rawText || codes.join('\n'), codes);
    if (doc.kind !== 'unknown' || doc.lines.length > 0 || doc.total != null || doc.vin) {
      return {
        kind: 'document',
        document: doc,
        payload: doc.number ?? doc.vin ?? codes[0] ?? 'document',
      };
    }
  }

  if (vin) {
    return { kind: 'navigate-vin', vin, payload: vin };
  }

  const code = codes[0] ?? (ocrResult.resolve?.barcode ? normalizeScanPayload(ocrResult.resolve.barcode) : '');
  if (!code) return 'retry';

  const classified = classifyPayloadOutcome(code);
  if (classified !== 'barcode') return classified;

  return mapApiResolve(code, ocrResult.resolve, 'ocr');
}
