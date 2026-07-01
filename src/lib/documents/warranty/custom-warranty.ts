import { splitBrandingParagraphs } from "@/domain/company-branding";

export const WARRANTY_LEGACY_DAYS_PER_MONTH = 30;

export type CustomWarrantyFields = {
  warrantyLabel?: string;
  warrantyText?: string;
  customWarrantyDays?: number;
  /** @deprecated Stored as days in new records; read only for legacy Firestore data. */
  customWarrantyMonths?: number;
  customWarrantyKm?: number;
};

export function legacyWarrantyMonthsToDays(months: number): number {
  return months * WARRANTY_LEGACY_DAYS_PER_MONTH;
}

export function resolveStoredWarrantyDays(
  days: number | undefined,
  legacyMonths: number | undefined,
): number | undefined {
  if (typeof days === "number" && days > 0) return days;
  if (typeof legacyMonths === "number" && legacyMonths > 0) {
    return legacyWarrantyMonthsToDays(legacyMonths);
  }
  return undefined;
}

export function formatWarrantyDurationLabel(days: number, km: number): string {
  return `${days} дн · ${km.toLocaleString("ru-KZ")} км`;
}

/** Parse "180 дн · 10 000 км" or legacy "6 мес · 10 000 км" from a free-form label. */
export function parseWarrantyDurationLabel(label: string | undefined): {
  days?: number;
  km?: number;
} {
  const normalized = label?.trim() ?? "";
  if (!normalized) return {};

  const daysMatch = normalized.match(/(\d+)\s*дн/i);
  const monthsMatch = normalized.match(/(\d+)\s*мес/i);
  const kmMatch = normalized.match(/(\d[\d\s]*)\s*км/i);

  const daysFromLabel = daysMatch ? Number(daysMatch[1]) : undefined;
  const monthsFromLabel = monthsMatch ? Number(monthsMatch[1]) : undefined;
  const kmRaw = kmMatch ? kmMatch[1].replace(/\s/g, "") : undefined;
  const km = kmRaw ? Number(kmRaw) : undefined;

  const days =
    daysFromLabel && daysFromLabel > 0
      ? daysFromLabel
      : monthsFromLabel && monthsFromLabel > 0
        ? legacyWarrantyMonthsToDays(monthsFromLabel)
        : undefined;

  return {
    days: Number.isFinite(days) && days! > 0 ? days : undefined,
    km: Number.isFinite(km) && km! > 0 ? km : undefined,
  };
}

export function resolveCustomWarrantyDuration(
  fields: CustomWarrantyFields,
  fallbackDays = 180,
  fallbackKm = 10_000,
): { days: number; km: number; label: string; paragraphs: string[] } {
  const parsed = parseWarrantyDurationLabel(fields.warrantyLabel);
  const days =
    resolveStoredWarrantyDays(fields.customWarrantyDays, fields.customWarrantyMonths) ??
    (parsed.days && parsed.days > 0 ? parsed.days : fallbackDays);
  const km =
    fields.customWarrantyKm && fields.customWarrantyKm > 0
      ? fields.customWarrantyKm
      : parsed.km && parsed.km > 0
        ? parsed.km
        : fallbackKm;

  const paragraphs = splitBrandingParagraphs(fields.warrantyText);
  const label = fields.warrantyLabel?.trim() || formatWarrantyDurationLabel(days, km);

  return { days, km, label, paragraphs };
}

export type MotorSaleWarrantyOverride = CustomWarrantyFields;
