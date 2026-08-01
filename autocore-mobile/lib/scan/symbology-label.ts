const SYMBOLOGY_LABELS: Record<string, string> = {
  qr: 'QR code',
  ean13: 'EAN-13 barcode',
  ean8: 'EAN-8 barcode',
  upc_a: 'UPC-A barcode',
  upc_e: 'UPC-E barcode',
  code128: 'Code 128 barcode',
  code39: 'Code 39 barcode',
  code93: 'Code 93 barcode',
  itf14: 'ITF-14 barcode',
  codabar: 'Codabar barcode',
  datamatrix: 'Data Matrix',
  pdf417: 'PDF417',
  aztec: 'Aztec',
};

export function symbologyLabel(symbology: string): string {
  const key = symbology.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SYMBOLOGY_LABELS[key] ?? 'Code';
}

export function formatScanPayloadPreview(payload: string, maxLength = 56): string {
  const trimmed = payload.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
