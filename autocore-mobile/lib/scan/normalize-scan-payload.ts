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

/** Client-side normalization before resolve — mirrors server `buildScanCodeVariants` priority. */
export function normalizeScanPayload(raw: string): string {
  const trimmed = raw.replace(CONTROL_CHARS, '').trim();
  if (!trimmed) return '';

  const variants = new Set<string>();
  const push = (value: string) => {
    const next = value.trim();
    if (next) variants.add(next);
  };

  push(trimmed);
  push(compactBarcode(trimmed));
  push(compactCode(trimmed));
  push(compactCode(trimmed).toUpperCase());

  const withoutPrefix = trimmed.replace(PREFIX_PATTERN, '').trim();
  if (withoutPrefix && withoutPrefix !== trimmed) {
    push(withoutPrefix);
    push(compactBarcode(withoutPrefix));
    push(compactCode(withoutPrefix));
  }

  const strippedCode39 = trimmed.replace(/^\*+|\*+$/g, '').trim();
  if (strippedCode39 && strippedCode39 !== trimmed) {
    push(strippedCode39);
    push(compactBarcode(strippedCode39));
  }

  const compact = compactBarcode(trimmed);
  if (/^\d{13}$/.test(compact) && compact.startsWith('0')) {
    push(compact.replace(/^0+/, ''));
  }
  if (/^\d{12,14}$/.test(compact)) {
    push(compact.padStart(13, '0'));
  }

  const gs1 = extractGs1Primary(compact);
  if (gs1) push(gs1);

  return [...variants][0] ?? trimmed;
}
