import { DOCUMENT_LOCALE_LOCK } from "@/lib/documents/document-locale";
import { getActiveUserCopyLocale } from "@/lib/user-copy";

/**
 * Documents follow `DOCUMENT_LOCALE_LOCK` (English, for the US market) when
 * it's set; otherwise they follow the locale their render context was built
 * with, set by `withDocumentLocale()` before rendering.
 */
function documentIntlLocale(): string {
  const locale = DOCUMENT_LOCALE_LOCK ?? getActiveUserCopyLocale();
  return locale === "en" ? "en-US" : "ru-KZ";
}

/**
 * Currency stays KZT (Kazakhstani Tenge) regardless of `DOCUMENT_LOCALE_LOCK`.
 * The lock changes *language and number formatting*, not the meaning of a
 * stored amount — a work order's `unitPrice` is a real KZT figure entered by
 * the business. Relabeling it USD without a conversion would misstate real
 * transaction values. Confirm explicitly before changing this.
 */
export function formatDocumentMoney(value: number): string {
  return new Intl.NumberFormat(documentIntlLocale(), {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isValidDocumentDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

export function formatDocumentDate(value: Date): string {
  if (!isValidDocumentDate(value)) return "—";
  return new Intl.DateTimeFormat(documentIntlLocale(), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function formatDocumentDateShort(value: Date): string {
  if (!isValidDocumentDate(value)) return "—";
  return new Intl.DateTimeFormat(documentIntlLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function coerceDocumentDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const parsed = (value as { toDate: () => Date }).toDate();
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return Number.isFinite(fallback.getTime()) ? fallback : new Date();
}

export function formatDocumentTime(value: Date): string {
  if (!isValidDocumentDate(value)) return "—";
  return new Intl.DateTimeFormat(documentIntlLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Intl locale tag for numbers inside a document, matching its render locale. */
export function documentNumberLocale(): string {
  return documentIntlLocale();
}
