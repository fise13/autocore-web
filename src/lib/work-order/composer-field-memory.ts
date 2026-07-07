const MAX_FIELD_VALUES = 12;

function storageKey(companyId: string, field: string): string {
  return `autocomplete:field:${companyId}:${field}`;
}

export function readComposerFieldValues(companyId: string | null | undefined, field: string): string[] {
  if (!companyId || !field || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(companyId, field));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function rememberComposerFieldValue(
  companyId: string | null | undefined,
  field: string,
  value: string,
): void {
  const trimmed = value.trim();
  if (!trimmed || !companyId || !field || typeof window === "undefined") return;

  const current = readComposerFieldValues(companyId, field);
  const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_FIELD_VALUES,
  );

  try {
    window.localStorage.setItem(storageKey(companyId, field), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
