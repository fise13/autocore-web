export function normalizeInventoryCode(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s+/g, "");
}
