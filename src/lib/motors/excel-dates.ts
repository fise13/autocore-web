import { parseMotorDateInput } from "@/lib/motor-dates";

/** Excel serial date (1900-based) or string → Date */
export function parseExcelDateValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30);
    const parsed = new Date(utc + value * 86_400_000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return parseMotorDateInput(value);
}

export function formatExportDate(
  value: Date | null | undefined,
  format: "dd.MM.yyyy" | "yyyy-MM-dd",
): string {
  if (!value) return "";
  if (format === "yyyy-MM-dd") {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const d = String(value.getDate()).padStart(2, "0");
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const y = value.getFullYear();
  return `${d}.${m}.${y}`;
}
