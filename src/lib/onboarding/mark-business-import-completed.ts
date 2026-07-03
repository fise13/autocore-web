import {
  CompanyAppConfig,
  defaultCompanyAppConfig,
} from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import {
  hasMigrationOfferCompleted,
  markMigrationOfferCompleted,
} from "@/lib/performance/session-flags";

const configRepository = createCompanyConfigRepository();

export async function markBusinessImportCompleted(
  companyId: string,
  userId: string,
): Promise<void> {
  if (!companyId || !userId) return;

  markMigrationOfferCompleted(companyId);

  const existing = await configRepository.readAppConfig(companyId);
  const config: CompanyAppConfig = existing ?? defaultCompanyAppConfig();
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
