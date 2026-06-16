import { splitBrandingParagraphs } from "@/domain/company-branding";

export type CustomWarrantyFields = {
  warrantyLabel?: string;
  warrantyText?: string;
  customWarrantyMonths?: number;
  customWarrantyKm?: number;
};

export function formatWarrantyDurationLabel(months: number, km: number): string {
  return `${months} мес · ${km.toLocaleString("ru-KZ")} км`;
}

/** Parse "6 мес · 10 000 км" or similar from a free-form label. */
export function parseWarrantyDurationLabel(label: string | undefined): {
  months?: number;
  km?: number;
} {
  const normalized = label?.trim() ?? "";
  if (!normalized) return {};

  const monthsMatch = normalized.match(/(\d+)\s*мес/i);
  const kmMatch = normalized.match(/(\d[\d\s]*)\s*км/i);

  const months = monthsMatch ? Number(monthsMatch[1]) : undefined;
  const kmRaw = kmMatch ? kmMatch[1].replace(/\s/g, "") : undefined;
  const km = kmRaw ? Number(kmRaw) : undefined;

  return {
    months: Number.isFinite(months) && months! > 0 ? months : undefined,
    km: Number.isFinite(km) && km! > 0 ? km : undefined,
  };
}

export function resolveCustomWarrantyDuration(
  fields: CustomWarrantyFields,
  fallbackMonths = 6,
  fallbackKm = 10_000,
): { months: number; km: number; label: string; paragraphs: string[] } {
  const parsed = parseWarrantyDurationLabel(fields.warrantyLabel);
  const months =
    fields.customWarrantyMonths && fields.customWarrantyMonths > 0
      ? fields.customWarrantyMonths
      : parsed.months && parsed.months > 0
        ? parsed.months
        : fallbackMonths;
  const km =
    fields.customWarrantyKm && fields.customWarrantyKm > 0
      ? fields.customWarrantyKm
      : parsed.km && parsed.km > 0
        ? parsed.km
        : fallbackKm;

  const paragraphs = splitBrandingParagraphs(fields.warrantyText);
  const label =
    fields.warrantyLabel?.trim() ||
    formatWarrantyDurationLabel(months, km);

  return { months, km, label, paragraphs };
}

export type MotorSaleWarrantyOverride = CustomWarrantyFields;
