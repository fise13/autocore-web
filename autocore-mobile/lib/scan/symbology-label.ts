const SYMBOLOGY_LABELS: Record<string, string> = {
  qr: 'QR-код',
  ean13: 'Штрихкод EAN-13',
  ean8: 'Штрихкод EAN-8',
  upc_a: 'Штрихкод UPC-A',
  upc_e: 'Штрихкод UPC-E',
  code128: 'Штрихкод Code 128',
  code39: 'Штрихкод Code 39',
  code93: 'Штрихкод Code 93',
  itf14: 'Штрихкод ITF-14',
  codabar: 'Штрихкод Codabar',
  datamatrix: 'Data Matrix',
  pdf417: 'PDF417',
  aztec: 'Aztec',
};

export function symbologyLabel(symbology: string): string {
  const key = symbology.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SYMBOLOGY_LABELS[key] ?? 'Код';
}

export function formatScanPayloadPreview(payload: string, maxLength = 56): string {
  const trimmed = payload.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
