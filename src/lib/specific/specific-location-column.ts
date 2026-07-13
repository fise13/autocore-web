import type { SpecificColumnDef } from "@/domain/specific-category";

/** Stable key for the injected «Место» column on parts / КПП grids. */
export const SPECIFIC_LOCATION_COLUMN_KEY = "warehouseLocation";

export const SPECIFIC_LOCATION_COLUMN: SpecificColumnDef = {
  id: "sys-warehouse-location",
  key: SPECIFIC_LOCATION_COLUMN_KEY,
  title: "Место",
  kind: "custom",
  width: 140,
  editable: true,
};

export function withSpecificLocationColumn(schema: SpecificColumnDef[]): SpecificColumnDef[] {
  if (schema.some((column) => column.key === SPECIFIC_LOCATION_COLUMN_KEY || column.title === "Место")) {
    return schema;
  }
  // Insert before trailing date columns when possible; otherwise append.
  const soldIdx = schema.findIndex(
    (column) => column.kind === "canonical" && column.slotIndex === 6,
  );
  if (soldIdx >= 0) {
    return [...schema.slice(0, soldIdx), SPECIFIC_LOCATION_COLUMN, ...schema.slice(soldIdx)];
  }
  return [...schema, SPECIFIC_LOCATION_COLUMN];
}
