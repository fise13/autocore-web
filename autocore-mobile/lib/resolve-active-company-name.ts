import { isCompanyIdDisplayValue } from '@/lib/company-display-name';
import { DEFAULT_COMPANY_ID, normalizeCompanyId } from '@/lib/company-id';
import type { UserCompanyMembership } from '@/types/rbac';

function pickCompanyLabel(
  value: string | null | undefined,
  companyId: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed || isCompanyIdDisplayValue(trimmed, companyId)) return null;
  return trimmed;
}

export function resolveActiveCompanyName(
  companyId: string | null | undefined,
  activeCompanyName: string | null | undefined,
  memberships: UserCompanyMembership[],
  fallback = 'Рабочее пространство',
  realtimeCompanyName?: string | null,
): string {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!companyId?.trim() || normalizedCompanyId === DEFAULT_COMPANY_ID) {
    return fallback;
  }

  const membership = memberships.find(
    (entry) => normalizeCompanyId(entry.companyId) === normalizedCompanyId,
  );

  return (
    pickCompanyLabel(realtimeCompanyName, normalizedCompanyId) ??
    pickCompanyLabel(activeCompanyName, normalizedCompanyId) ??
    pickCompanyLabel(membership?.name, normalizedCompanyId) ??
    fallback
  );
}
