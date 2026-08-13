/** Shared Firestore company id (Mac + web default workspace). */
export const DEFAULT_COMPANY_ID = 'default';

export function normalizeCompanyId(companyId: string | null | undefined): string {
  const trimmed = companyId?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : DEFAULT_COMPANY_ID;
}

export function resolveCompanyIdsForSync(companyId: string | null | undefined): string[] {
  return [normalizeCompanyId(companyId)];
}

export function isUnassignedCompanyId(companyId: string | null | undefined): boolean {
  const trimmed = companyId?.trim() ?? '';
  return trimmed.length === 0;
}

export function isDefaultCompanyId(companyId: string | null | undefined): boolean {
  return (companyId?.trim() ?? '') === DEFAULT_COMPANY_ID;
}

export function canSwitchCompanyViaInvite(companyId: string | null | undefined): boolean {
  const trimmed = companyId?.trim() ?? '';
  return trimmed.length === 0 || trimmed === DEFAULT_COMPANY_ID;
}

/**
 * Any non-empty company id (including legacy shared `default`) is queryable.
 */
export function isProductionCompanyId(companyId: string | null | undefined): boolean {
  return !isUnassignedCompanyId(companyId);
}

/**
 * Match web: trust an assigned profile companyId (including `default`).
 * Only fall through to memberships when the profile has no company yet.
 *
 * Never silently demote `default` → first non-default membership — that stole
 * workspaces and emptied finance/motors for users whose data lives on `default`.
 */
export function preferCompanyId(
  profileCompanyId: string | null | undefined,
  candidateIds: Array<string | null | undefined>,
): string | null {
  if (!isUnassignedCompanyId(profileCompanyId)) {
    return normalizeCompanyId(profileCompanyId);
  }

  const candidates = candidateIds
    .map((value) => value?.trim() || null)
    .filter((value): value is string => Boolean(value));

  const nonDefault = candidates.find((id) => !isDefaultCompanyId(id));
  if (nonDefault) return normalizeCompanyId(nonDefault);

  return candidates[0] ? normalizeCompanyId(candidates[0]) : null;
}
