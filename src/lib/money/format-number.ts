// Drives digit grouping app-wide: en-US gives `1,234,567` (comma thousands,
// period decimals). Keep parse/format consistent with that locale.
const GROUP_LOCALE = "en-US";

export type GroupedNumberFormatOptions = {
  allowDecimals?: boolean;
  maximumFractionDigits?: number;
};

export function formatGroupedNumber(
  value: number,
  options: GroupedNumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return "";

  const { allowDecimals = false, maximumFractionDigits = allowDecimals ? 2 : 0 } = options;

  return new Intl.NumberFormat(GROUP_LOCALE, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse a grouped number string. Commas are thousand separators (en-US), not
 * decimals — otherwise mileage like `330,909` becomes `330.909` → `331`.
 */
export function parseGroupedNumber(input: string): number {
  const trimmed = input.trim().replace(/[\s\u00a0]/g, "");
  if (!trimmed) return Number.NaN;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    // en-US money: 1,234.56 — last separator is the decimal.
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastDot > lastComma) {
      normalized = trimmed.replace(/,/g, "");
    } else {
      // EU-style paste: 1.234,56
      normalized = trimmed.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasComma) {
    // Thousand groups: 330,909 or 1,234,567
    if (/^\d{1,3}(,\d{3})+$/.test(trimmed)) {
      normalized = trimmed.replace(/,/g, "");
    } else if (/^\d+,\d{1,2}$/.test(trimmed)) {
      // Short trailing fraction typed with a comma (legacy / EU habit).
      normalized = trimmed.replace(",", ".");
    } else {
      // Ambiguous multi-comma input — treat commas as thousands.
      normalized = trimmed.replace(/,/g, "");
    }
  } else {
    normalized = trimmed;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Formats user typing into grouped digits (and optional decimals). */
export function formatGroupedInput(
  raw: string,
  options: GroupedNumberFormatOptions = {},
): string {
  const allowDecimals = options.allowDecimals ?? false;
  const maxFractionDigits = options.maximumFractionDigits ?? (allowDecimals ? 2 : 0);
  const trimmed = raw.trim();

  if (!trimmed) return "";

  if (allowDecimals) {
    const normalized = trimmed.replace(/[\s\u00a0]/g, "").replace(",", ".");
    const [integerPart = "", ...fractionParts] = normalized.split(".");
    const digits = integerPart.replace(/\D/g, "");
    const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, maxFractionDigits);
    const hasDecimalMark = normalized.includes(".");

    if (!digits && !fraction) return hasDecimalMark ? "0." : "";

    const formattedInteger = digits ? formatGroupedNumber(Number(digits)) : "0";

    if (hasDecimalMark) {
      return fraction.length > 0 ? `${formattedInteger}.${fraction}` : `${formattedInteger}.`;
    }

    return formattedInteger;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return formatGroupedNumber(Number(digits));
}

export function formatGroupedNumberOrEmpty(
  value: number,
  options?: GroupedNumberFormatOptions,
): string {
  if (!value) return "";
  return formatGroupedNumber(value, options);
}
