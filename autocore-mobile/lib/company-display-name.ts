import { normalizeCompanyId } from '@/lib/company-id';

type CompanyNameSource = {
  name?: string | null;
  legalName?: string | null;
  shortName?: string | null;
  displayName?: string | null;
  companyName?: string | null;
  title?: string | null;
};

export function isCompanyIdDisplayValue(
  value: string | null | undefined,
  companyId: string | null | undefined,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed || !companyId?.trim()) return false;
  return trimmed === normalizeCompanyId(companyId);
}

export function readCompanyDisplayName(
  source: CompanyNameSource | Record<string, unknown> | null | undefined,
  companyId?: string | null,
): string | null {
  if (!source || typeof source !== 'object') return null;

  const record = source as CompanyNameSource;
  const candidates = [
    record.name,
    record.legalName,
    record.shortName,
    record.displayName,
    record.companyName,
    record.title,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim();
    if (!value) continue;
    if (isCompanyIdDisplayValue(value, companyId)) continue;
    return value;
  }

  return null;
}
