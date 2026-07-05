/** Normalizes SKU / article codes for display (fixes stray spaces around hyphens). */
export function normalizeInventoryCode(value: string): string {
  return value
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\(\s+/g, '(')
    .replace(/\s+/g, ' ');
}

function normalizeCompareKey(value: string): string {
  return normalizeInventoryCode(value).replace(/\s/g, '').toLowerCase();
}

/** Returns a subtitle only when it adds information beyond the primary code. */
export function inventoryCardSubtitle(code: string, vehicle: string): string | undefined {
  const normalizedCode = normalizeCompareKey(code);
  const trimmed = vehicle.trim();
  if (!trimmed) return undefined;

  const parts = trimmed
    .split('·')
    .map((part) => normalizeInventoryCode(part))
    .filter(Boolean);

  const unique = parts.filter((part) => {
    const key = normalizeCompareKey(part);
    return key !== normalizedCode && !normalizedCode.includes(key) && !key.includes(normalizedCode);
  });

  if (unique.length > 0) {
    return unique.join(' · ');
  }

  const vehicleKey = normalizeCompareKey(trimmed);
  if (vehicleKey !== normalizedCode) {
    return normalizeInventoryCode(trimmed);
  }

  return undefined;
}

export { formatPrice, convertPrice } from '@/store/money-format-store';

export function formatVin(vin?: string): string | undefined {
  if (!vin) return undefined;
  if (vin.length <= 12) return vin;
  return `${vin.slice(0, 8)}…${vin.slice(-4)}`;
}
