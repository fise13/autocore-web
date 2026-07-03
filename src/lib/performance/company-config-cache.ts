import type { CompanyAppConfig } from "@/domain/company-config";

const CONFIG_CACHE_PREFIX = "autocore-company-config:";

type CachedCompanyAppConfig = Omit<CompanyAppConfig, "updatedAt"> & {
  updatedAt?: string;
};

function serialize(config: CompanyAppConfig): string {
  const payload: CachedCompanyAppConfig = {
    ...config,
    updatedAt: config.updatedAt?.toISOString(),
  };
  return JSON.stringify(payload);
}

function deserialize(raw: string): CompanyAppConfig | null {
  try {
    const parsed = JSON.parse(raw) as CachedCompanyAppConfig;
    return {
      ...parsed,
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined,
    };
  } catch {
    return null;
  }
}

export function readCachedCompanyAppConfig(companyId: string): CompanyAppConfig | null {
  if (typeof window === "undefined" || !companyId) return null;
  const raw = sessionStorage.getItem(`${CONFIG_CACHE_PREFIX}${companyId}`);
  if (!raw) return null;
  return deserialize(raw);
}

export function writeCachedCompanyAppConfig(companyId: string, config: CompanyAppConfig): void {
  if (typeof window === "undefined" || !companyId) return;
  try {
    sessionStorage.setItem(`${CONFIG_CACHE_PREFIX}${companyId}`, serialize(config));
  } catch {
    // Ignore cache write failures.
  }
}
