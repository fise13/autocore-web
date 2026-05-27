export function normalizeCompanyId(companyId: string | null | undefined): string {
  const trimmed = companyId?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "default";
}

export function resolveCompanyIdsForSync(companyId: string | null | undefined): string[] {
  return [normalizeCompanyId(companyId)];
}
