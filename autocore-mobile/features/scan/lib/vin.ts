/**
 * Deterministic VIN handling (ISO 3779). No AI, no network.
 *
 * The VIN alphabet excludes I, O and Q, so OCR confusions are corrected
 * deterministically (I→1, O→0, Q→0) before validation.
 */

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

function charValue(char: string): number {
  if (char >= '0' && char <= '9') return Number(char);
  return TRANSLITERATION[char] ?? 0;
}

/**
 * ISO 3779 check digit (position 9). Mandatory in North America and China;
 * many EU manufacturers do not compute it, so treat this as a confidence
 * signal, never a rejection criterion.
 */
export function hasValidVinCheckDigit(vin: string): boolean {
  if (!VIN_PATTERN.test(vin)) return false;
  const sum = vin.split('').reduce((acc, char, index) => acc + charValue(char) * WEIGHTS[index], 0);
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === expected;
}

/**
 * Normalizes a raw scan/OCR payload into a structurally valid VIN.
 * Returns null when the payload cannot be a VIN.
 */
export function normalizeVin(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[\s\-.]/g, '');
  if (cleaned.length !== 17) return null;
  if (VIN_PATTERN.test(cleaned)) return cleaned;

  const corrected = cleaned.replace(/I/g, '1').replace(/[OQ]/g, '0');
  return VIN_PATTERN.test(corrected) ? corrected : null;
}

/**
 * Finds the first VIN inside free-form OCR text or a list of extracted codes.
 * Prefers candidates with a valid check digit when multiple exist.
 */
export function findVinInText(text: string): string | null {
  const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, ' ');
  const candidates = upper.match(/[A-Z0-9]{17}/g) ?? [];
  let fallback: string | null = null;

  for (const candidate of candidates) {
    const vin = normalizeVin(candidate);
    if (!vin) continue;
    if (hasValidVinCheckDigit(vin)) return vin;
    fallback ??= vin;
  }

  return fallback;
}

export function findVinInCodes(codes: string[]): string | null {
  let fallback: string | null = null;
  for (const code of codes) {
    const vin = normalizeVin(code) ?? findVinInText(code);
    if (!vin) continue;
    if (hasValidVinCheckDigit(vin)) return vin;
    fallback ??= vin;
  }
  return fallback;
}

/** Deterministic WMI region hint from chars 1–3 (coarse, no network). */
export function vinRegionHint(vin: string): string | null {
  const wmi = vin.slice(0, 1);
  if (wmi >= '1' && wmi <= '5') return 'North America';
  if (wmi >= 'J' && wmi <= 'R') return 'Asia';
  if (wmi >= 'S' && wmi <= 'Z') return 'Europe';
  if (wmi >= '6' && wmi <= '7') return 'Oceania';
  if (wmi >= '8' && wmi <= '9') return 'South America';
  if (wmi === 'A' || wmi === 'B' || wmi === 'C' || wmi === 'D') return 'Africa';
  return null;
}
