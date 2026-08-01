import { classifyScanPayload } from './classify-payload';

export type RelocateScanTarget =
  | { kind: 'locationId'; id: string; payload: string }
  | { kind: 'locationCode'; code: string; payload: string }
  | { kind: 'reject'; reason: string; payload: string };

/**
 * While Move-to-location is armed, map the next scan into a destination
 * (QR `autocore://loc|s/{id}` or free-form cell code). Reject product/VIN/URL.
 */
export function interpretRelocateScan(payload: string): RelocateScanTarget {
  const raw = payload.trim();
  if (!raw) {
    return { kind: 'reject', reason: 'Empty code', payload };
  }

  const classified = classifyScanPayload(raw);

  if (classified.type === 'entity-link') {
    if (classified.entity === 'location' || classified.entity === 'shelf') {
      return { kind: 'locationId', id: classified.id, payload: raw };
    }
    return {
      kind: 'reject',
      reason: 'Scan a location QR, not another entity',
      payload: raw,
    };
  }

  if (classified.type === 'vin') {
    return { kind: 'reject', reason: 'Scan a location, not a VIN', payload: raw };
  }

  if (classified.type === 'url') {
    return { kind: 'reject', reason: 'Scan a location QR or cell code', payload: raw };
  }

  // product-barcode and free-form codes — treat as location display code.
  // (Location labels like A-01 rarely collide with EAN; if they do, list picker remains.)
  const code =
    classified.type === 'product-barcode' || classified.type === 'code'
      ? classified.code
      : raw;

  return { kind: 'locationCode', code, payload: raw };
}
