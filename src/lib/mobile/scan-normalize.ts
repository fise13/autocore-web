import { normalizeBarcode } from "@/lib/warehouse/warehouse-sync-ids";
import { normalizeInventoryCode } from "@/lib/barcode/scan-code";

const PREFIX_PATTERN = /^(AC|EAN|SKU|QR|BARCODE|GTIN):/i;

/** Ordered unique variants for exact-tier lookups (highest priority first). */
export function buildScanCodeVariants(raw: string): string[] {
  const trimmed = raw.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!trimmed) return [];

  const variants = new Set<string>();
  const push = (value: string) => {
    const next = value.trim();
    if (next) variants.add(next);
  };

  push(trimmed);
  push(normalizeBarcode(trimmed));
  push(normalizeInventoryCode(trimmed));
  push(normalizeInventoryCode(trimmed).toUpperCase());

  const withoutPrefix = trimmed.replace(PREFIX_PATTERN, "").trim();
  if (withoutPrefix && withoutPrefix !== trimmed) {
    push(withoutPrefix);
    push(normalizeBarcode(withoutPrefix));
    push(normalizeInventoryCode(withoutPrefix));
  }

  const strippedCode39 = trimmed.replace(/^\*+|\*+$/g, "").trim();
  if (strippedCode39 && strippedCode39 !== trimmed) {
    push(strippedCode39);
    push(normalizeBarcode(strippedCode39));
    push(normalizeInventoryCode(strippedCode39));
  }

  const compact = normalizeBarcode(trimmed);
  if (/^\d{13}$/.test(compact) && compact.startsWith("0")) {
    push(compact.replace(/^0+/, ""));
  }
  if (/^\d{12,14}$/.test(compact)) {
    push(compact.padStart(13, "0"));
  }

  const gs1 = extractGs1Primary(compact);
  if (gs1) push(gs1);

  return [...variants];
}

function extractGs1Primary(value: string): string | null {
  const match = value.match(/01(\d{14})/);
  if (match?.[1]) return match[1].replace(/^0+/, "") || match[1];
  return null;
}

export function primaryScanCode(raw: string): string {
  const variants = buildScanCodeVariants(raw);
  return variants[0] ?? "";
}

export function scanToken(value: string): string {
  return normalizeBarcode(value).toLowerCase();
}
