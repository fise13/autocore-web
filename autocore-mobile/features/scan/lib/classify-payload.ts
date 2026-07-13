/**
 * Deterministic payload router — the first step of every scan.
 * Pure string classification, zero network, ordered rules (first match wins).
 * See docs/MOBILE-SCANNER-DESIGN.md §2.
 */

import { normalizeVin } from './vin';

export type ScanEntityLinkKind =
  | 'order'
  | 'item'
  | 'client'
  | 'shelf'
  | 'location'
  | 'invoice'
  | 'motor';

export type ScanPayloadClass =
  | { type: 'entity-link'; entity: ScanEntityLinkKind; id: string }
  | { type: 'vin'; vin: string }
  | { type: 'product-barcode'; code: string }
  | { type: 'url'; url: string }
  | { type: 'code'; code: string };

const ENTITY_PREFIXES: Record<string, ScanEntityLinkKind> = {
  o: 'order',
  order: 'order',
  p: 'item',
  item: 'item',
  c: 'client',
  client: 'client',
  s: 'shelf',
  shelf: 'shelf',
  loc: 'location',
  location: 'location',
  i: 'invoice',
  invoice: 'invoice',
  m: 'motor',
  motor: 'motor',
};

const ENTITY_LINK_RE = /^autocore:\/\/([a-z]+)\/([\w-]+)$/i;

function parseEntityLink(payload: string): ScanPayloadClass | null {
  const match = ENTITY_LINK_RE.exec(payload.trim());
  if (!match) return null;
  const entity = ENTITY_PREFIXES[match[1].toLowerCase()];
  if (!entity) return null;
  return { type: 'entity-link', entity, id: match[2] };
}

/** EAN-13 / EAN-8 / UPC-A modulo-10 checksum. */
function hasValidEanChecksum(digits: string): boolean {
  const numbers = digits.split('').map(Number);
  const check = numbers[numbers.length - 1];
  // Weights alternate 1/3 from the right, starting with 3 next to the check digit.
  const sum = numbers
    .slice(0, -1)
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function classifyScanPayload(raw: string): ScanPayloadClass {
  const payload = raw.trim();

  const entityLink = parseEntityLink(payload);
  if (entityLink) return entityLink;

  const vin = normalizeVin(payload);
  if (vin) return { type: 'vin', vin };

  if (/^\d{8}$|^\d{12}$|^\d{13}$/.test(payload) && hasValidEanChecksum(payload)) {
    return { type: 'product-barcode', code: payload };
  }

  if (/^https?:\/\/\S+$/i.test(payload)) {
    return { type: 'url', url: payload };
  }

  return { type: 'code', code: payload };
}

export function isHttpUrl(payload: string | null): boolean {
  return !!payload && /^https?:\/\/\S+$/i.test(payload.trim());
}
