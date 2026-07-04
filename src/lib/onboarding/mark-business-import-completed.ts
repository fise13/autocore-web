import {
  CompanyAppConfig,
  defaultCompanyAppConfig,
} from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import {
  readCachedCompanyAppConfig,
  writeCachedCompanyAppConfig,
} from "@/lib/performance/company-config-cache";
import {
  hasMigrationOfferCompleted,
  markMigrationOfferCompleted,
} from "@/lib/performance/session-flags";

const configRepository = createCompanyConfigRepository();

function cacheBusinessImportCompleted(companyId: string, config: CompanyAppConfig): void {
  writeCachedCompanyAppConfig(companyId, {
    ...config,
    businessImportCompleted: true,
  });
}

/** Immediate client-side skip so the step never returns after reload. */
export function markBusinessImportSkippedLocally(companyId: string): void {
  if (!companyId) return;

  markMigrationOfferCompleted(companyId);

  const cached = readCachedCompanyAppConfig(companyId);
  if (cached) {
    cacheBusinessImportCompleted(companyId, cached);
    return;
  }

  writeCachedCompanyAppConfig(companyId, {
    ...defaultCompanyAppConfig(),
    onboardingCompleted: true,
    businessImportCompleted: true,
  });
}

export async function markBusinessImportCompleted(
  companyId: string,
  userId: string,
): Promise<void> {
  if (!companyId) return;

  // Persist immediately so reload never re-shows the step, even if Firestore is slow.
  markBusinessImportSkippedLocally(companyId);
  if (!userId) return;

  const existing = await configRepository.readAppConfig(companyId);
  const config: CompanyAppConfig =
    existing ?? readCachedCompanyAppConfig(companyId) ?? defaultCompanyAppConfig();
  cacheBusinessImportCompleted(companyId, config);
  if (config.businessImportCompleted) return;

  await configRepository.saveAppConfig(
    companyId,
    { ...config, businessImportCompleted: true },
    userId,
  );
}

export function hasCompletedBusinessImport(
  companyId: string,
  config: CompanyAppConfig | null | undefined,
): boolean {
  if (!companyId) return false;
  return Boolean(config?.businessImportCompleted) || hasMigrationOfferCompleted(companyId);
}
