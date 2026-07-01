/**
 * Value-level detectors.
 *
 * These inspect raw cell values (not headers) to recognise field types from the
 * data itself. They power both column detection (a column of VINs is the VIN
 * column even with a weird header) and per-cell validation.
 */

import { fold } from "@/lib/domain/normalize";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const CURRENT_YEAR = new Date().getFullYear();

/** Strict 17-char VIN (no I/O/Q). */
export function isVin(value: string): boolean {
  const trimmed = value.trim();
  return VIN_RE.test(trimmed);
}

/** Plausible vehicle/engine year (1950 … next year). */
export function parseYear(value: string): number | null {
  const match = value.trim().match(/\b(19[5-9]\d|20\d\d)\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1950 || year > CURRENT_YEAR + 1) return null;
  return year;
}

const CURRENCY_TOKENS: Array<{ code: string; patterns: RegExp }> = [
  { code: "RUB", patterns: /(₽|руб|rub|р\.)/i },
  { code: "USD", patterns: /(\$|usd|долл)/i },
  { code: "EUR", patterns: /(€|eur|евро)/i },
  { code: "KZT", patterns: /(₸|kzt|тенге|тг)/i },
  { code: "UAH", patterns: /(₴|uah|грн)/i },
  { code: "JPY", patterns: /(¥|jpy|иен)/i },
  { code: "CNY", patterns: /(cny|юан|rmb)/i },
  { code: "BYN", patterns: /(byn|бел\.?\s*руб)/i },
];

/** Detect a currency code from a cell ("12 000 ₽" → "RUB"). */
export function detectCurrency(value: string): string | null {
  for (const { code, patterns } of CURRENCY_TOKENS) {
    if (patterns.test(value)) return code;
  }
  return null;
}

/**
 * Parse a money/number cell that may use spaces, thin spaces, commas or dots as
 * separators ("1 250,50" / "1,250.50" / "12000₽" → number).
 */
export function parseNumericValue(value: string): number | null {
  const raw = value.replace(/[^\d.,-]/g, "").trim();
  if (!raw || raw === "-") return null;

  let normalized = raw;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    // Last separator is the decimal one.
    normalized = raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (hasComma) {
    // Comma as decimal only when it looks like "123,45".
    normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Looks like a price (positive number, optionally with a currency marker). */
export function looksLikePrice(value: string): boolean {
  if (looksLikeDateValue(value)) return false;
  const num = parseNumericValue(value);
  if (num === null || num <= 0) return false;
  return detectCurrency(value) !== null || num >= 50;
}

/** Excel serial date or common RU/US date strings — not mileage or price. */
export function looksLikeDateValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(trimmed)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) return true;
  const num = parseNumericValue(trimmed);
  if (num !== null && Number.isInteger(num) && num >= 40_000 && num <= 60_000) return true;
  return false;
}

/** Looks like mileage ("128 500 км" / "128500"). */
export function looksLikeMileage(value: string): boolean {
  if (looksLikeDateValue(value)) return false;
  if (/(км|km|миль|mil|пробег)/i.test(value)) return true;
  const num = parseNumericValue(value);
  return num !== null && num >= 1000 && Number.isInteger(num);
}

/** Looks like a small integer count (quantity). */
export function looksLikeQuantity(value: string): boolean {
  const num = parseNumericValue(value);
  return num !== null && Number.isInteger(num) && num >= 0 && num <= 100000;
}

const PHOTO_EXT_RE = /\.(jpe?g|png|webp|gif|heic|bmp|tiff?)$/i;

/** Cell points at an image (filename or URL). */
export function looksLikePhoto(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return PHOTO_EXT_RE.test(trimmed) || /^https?:\/\/.+\.(jpe?g|png|webp)/i.test(trimmed);
}

const CONDITION_TOKENS = [
  "новый",
  "новая",
  "б/у",
  "бу",
  "used",
  "new",
  "контракт",
  "восстановл",
  "refurb",
  "идеал",
];

/** Cell describes a condition/state ("б/у", "контрактный", "new"). */
export function looksLikeCondition(value: string): boolean {
  const folded = fold(value);
  return CONDITION_TOKENS.some((token) => folded.includes(fold(token)));
}

/**
 * A serial/part number heuristic: alphanumeric with digits, not a pure number,
 * not a VIN. Used to distinguish serial/SKU columns from free text.
 */
export function looksLikeCode(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 32) return false;
  if (isVin(trimmed)) return false;
  const hasDigit = /\d/.test(trimmed);
  const hasLetter = /[a-zа-я]/i.test(trimmed);
  const compact = /^[a-z0-9\-/.]+$/i.test(trimmed.replace(/\s/g, ""));
  return hasDigit && (hasLetter || compact);
}
