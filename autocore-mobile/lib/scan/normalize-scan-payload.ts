const PREFIX_PATTERN = /^(AC|EAN|SKU|QR|BARCODE|GTIN):/i;
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

function compactBarcode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function compactCode(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

function extractGs1Primary(value: string): string | null {
  const match = value.match(/01(\d{14})/);
  if (match?.[1]) return match[1].replace(/^0+/, '') || match[1];
  return null;
}

/** Dedupe key — same logical scan reads map to one key. */
export function scanPayloadKey(raw: string): string {
  return normalizeScanPayload(raw).toLowerCase();
}

/** Client-side normalization for classify/dedupe — server builds full variants from raw payload. */
export function normalizeScanPayload(raw: string): string {
  const trimmed = raw.replace(CONTROL_CHARS, '').trim();
  if (!trimmed) return '';

  const strippedCode39 = trimmed.replace(/^\*+|\*+$/g, '').trim();
  const base = strippedCode39 && strippedCode39 !== trimmed ? strippedCode39 : trimmed;

  const compact = compactBarcode(base);
  if (/^\d{8,14}$/.test(compact)) {
    if (/^\d{13}$/.test(compact) && compact.startsWith('0')) {
      return compact.replace(/^0+/, '') || compact;
    }
    if (/^\d{12,14}$/.test(compact)) {
      return compact.padStart(13, '0');
    }
    return compact;
  }

  const gs1 = extractGs1Primary(compact);
  if (gs1) return gs1;

  const withoutPrefix = base.replace(PREFIX_PATTERN, '').trim();
  if (withoutPrefix && withoutPrefix !== base) {
    return compactCode(withoutPrefix);
  }

  return compactCode(base);
}
