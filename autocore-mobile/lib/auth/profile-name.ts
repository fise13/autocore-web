export function isCompleteFullName(name: string | null | undefined): boolean {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length >= 2;
}
