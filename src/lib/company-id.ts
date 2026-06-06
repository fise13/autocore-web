/** Shared Firestore company id (Mac + web default workspace). */
export const DEFAULT_COMPANY_ID = "default";

export function normalizeCompanyId(companyId: string | null | undefined): string {
  const trimmed = companyId?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_COMPANY_ID;
}

export function resolveCompanyIdsForSync(companyId: string | null | undefined): string[] {
  return [normalizeCompanyId(companyId)];
}

/** User has not linked to any company in Firestore yet. */
export function isUnassignedCompanyId(companyId: string | null | undefined): boolean {
  const trimmed = companyId?.trim() ?? "";
  return trimmed.length === 0;
}

/** Empty profile or only the shared default workspace — can join another team via invite. */
export function canSwitchCompanyViaInvite(companyId: string | null | undefined): boolean {
  const trimmed = companyId?.trim() ?? "";
  return trimmed.length === 0 || trimmed === DEFAULT_COMPANY_ID;
}
