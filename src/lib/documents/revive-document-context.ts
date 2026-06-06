import { DocumentContext } from "@/lib/documents/document-context";

function reviveDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function reviveDocumentContext(raw: DocumentContext): DocumentContext {
  const assigneeNames =
    raw.assigneeNames instanceof Map
      ? raw.assigneeNames
      : new Map(Object.entries((raw.assigneeNames ?? {}) as Record<string, string>));

  return {
    ...raw,
    assigneeNames,
    generatedAt: reviveDate(raw.generatedAt),
    vehicleLogbook: (raw.vehicleLogbook ?? []).map((entry) => ({
      ...entry,
      date: reviveDate(entry.date),
    })),
    order: {
      ...raw.order,
      createdAt: reviveDate(raw.order.createdAt),
      updatedAt: reviveDate(raw.order.updatedAt),
      confirmedAt: raw.order.confirmedAt ? reviveDate(raw.order.confirmedAt) : undefined,
      completedAt: raw.order.completedAt ? reviveDate(raw.order.completedAt) : undefined,
      deliveredAt: raw.order.deliveredAt ? reviveDate(raw.order.deliveredAt) : undefined,
      cancelledAt: raw.order.cancelledAt ? reviveDate(raw.order.cancelledAt) : undefined,
    },
  };
}
