import { InventoryImportRow } from "@/domain/inventory-import";

function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = omitUndefinedDeep(nested);
      if (cleaned !== undefined) {
        next[key] = cleaned;
      }
    }
    return next;
  }
  return value;
}

export function sanitizeImportRowForFirestore(row: InventoryImportRow): InventoryImportRow {
  return omitUndefinedDeep(row) as InventoryImportRow;
}

export function sanitizeImportRowsForFirestore(rows: InventoryImportRow[]): InventoryImportRow[] {
  return rows.map(sanitizeImportRowForFirestore);
}
