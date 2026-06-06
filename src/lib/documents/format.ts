export function formatDocumentMoney(value: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDocumentDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-KZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function formatDocumentDateShort(value: Date): string {
  if (!Number.isFinite(value.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-KZ", {
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
  return new Intl.DateTimeFormat("ru-KZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
