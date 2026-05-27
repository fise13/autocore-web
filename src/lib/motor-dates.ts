import { format, isValid, parse } from "date-fns";
import { ru } from "date-fns/locale";

export function formatMotorDate(value: Date | null | undefined): string {
  if (!value || !isValid(value)) return "";
  return format(value, "dd.MM.yyyy", { locale: ru });
}

export function parseMotorDateInput(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (value == null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const dotted = parse(trimmed, "dd.MM.yyyy", new Date());
  if (isValid(dotted)) return dotted;

  const iso = new Date(trimmed);
  return isValid(iso) ? iso : null;
}
