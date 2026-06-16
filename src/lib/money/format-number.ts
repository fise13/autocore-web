const GROUP_LOCALE = "ru-RU";

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

export function parseGroupedNumber(input: string): number {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return Number.NaN;
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
    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    const [integerPart = "", ...fractionParts] = normalized.split(".");
    const digits = integerPart.replace(/\D/g, "");
    const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, maxFractionDigits);

    if (!digits && !fraction) return normalized.includes(".") || normalized.includes(",") ? "0," : "";

    const formattedInteger = digits ? formatGroupedNumber(Number(digits)) : "0";

    if (normalized.includes(".") || normalized.includes(",")) {
      return fraction.length > 0 ? `${formattedInteger},${fraction}` : `${formattedInteger},`;
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
