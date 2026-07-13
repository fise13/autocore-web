import { UNLOCATED_LOCATION_LABEL } from "@/domain/warehouse-location";

type LocationFields = {
  primaryLocationCode?: string | null;
  warehouseLocation?: string | null;
};

/**
 * Dual-read display label while free-text warehouseLocation and structured
 * primaryLocationCode coexist. Shared by inventory items, motors, specific rows.
 */
export function resolveItemLocationLabel(item: LocationFields): string {
  const primary = item.primaryLocationCode?.trim();
  if (primary) return primary;
  const legacy = item.warehouseLocation?.trim();
  if (legacy) return legacy;
  return "";
}

export function resolveItemLocationLabelOrUnlocated(item: LocationFields): string {
  return resolveItemLocationLabel(item) || UNLOCATED_LOCATION_LABEL;
}

/** Prefer structured fields, then common specific-record data keys. */
export function resolveSpecificRecordLocationLabel(
  record: LocationFields & { data?: Record<string, string> },
): string {
  const fromFields = resolveItemLocationLabel(record);
  if (fromFields) return fromFields;
  const data = record.data;
  if (!data) return "";
  return (
    data.warehouseLocation?.trim() ||
    data["Место"]?.trim() ||
    data.location?.trim() ||
    ""
  );
}
